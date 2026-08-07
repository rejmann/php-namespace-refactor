# Plano de abstrações (adapter) — rascunho em discussão

> **Status:** rascunho de planejamento, nada aqui foi implementado ainda. Não está
> linkado em [README.md](./README.md) de propósito — quando algum item virar código
> de verdade, a documentação correspondente deve migrar pro doc de arquitetura/
> operação certo (ex.: [namespace-index.md](./namespace-index.md)) e sair daqui.

Mapeamento dos pontos do `php-namespace-refactor` onde o padrão adapter/strategy
(mesmo espírito do exemplo `PreCapturarFormaPagamentoAdapter` que motivou a
conversa) se aplica, organizado pelos dois contextos que disparam trabalho no
índice/arquivos:

- **Contexto A — eventos de arquivo**: create, delete, rename (`workspace.onDidCreateFiles`,
  `onDidDeleteFiles`, `onDidRenameFiles`)
- **Contexto B — edição dentro do arquivo**: save de um `TextDocument` já aberto
  (`workspace.onDidSaveTextDocument`)

---

## Contexto A — eventos de arquivo (create / delete / rename)

### A.1 `AffectedFilesFinder` — maior ganho de performance

**Onde:** [`MultiFileReferenceUpdater.ts:73-82`](../src/app/services/update/MultiFileReferenceUpdater.ts#L73-L82) e [`:234-263`](../src/app/services/update/MultiFileReferenceUpdater.ts#L234-L263)

Hoje toda renomeação faz **duas** buscas e junta o resultado com `Set`:

- `indexedPaths` — lookup O(1) no `NamespaceIndex` (barato)
- `scannedPaths` — lê o conteúdo de **todo** arquivo do workspace via `workspace.fs.readFile`
  só pra checar `text.includes(useOldNamespace)` (caro, escala com o tamanho do projeto,
  roda sempre, mesmo quando o índice já é suficiente)

**Abstração proposta:**

```ts
interface AffectedFilesFinder {
  find(useOldNamespace: string, ignoreFile: string): Promise<string[]>;
}

class IndexAffectedFilesFinder implements AffectedFilesFinder { /* NamespaceIndex.getFilesUsing */ }
class ScanAffectedFilesFinder implements AffectedFilesFinder { /* full-text scan, fallback */ }
```

Um resolver decide se o `ScanAffectedFilesFinder` precisa rodar (índice ausente/desabilitado/stale)
em vez de somar as duas estratégias incondicionalmente como hoje.

---

### A.2 Leitura de conteúdo de arquivo — duplicada em 3 lugares

**Onde:**
- [`FileCreatedSubscriber.ts:14`](../src/app/subscribers/FileCreatedSubscriber.ts#L14)
- [`NamespaceIndexBuilder.ts:18`](../src/infra/index/NamespaceIndexBuilder.ts#L18)
- [`MultiFileReferenceUpdater.ts:249`](../src/app/services/update/MultiFileReferenceUpdater.ts#L249) (dentro do scan do item A.1)

As três fazem o mesmo `try { workspace.fs.readFile → Buffer.toString() } catch { skip }`.

**Abstração proposta:**

```ts
interface WorkspaceFileReader {
  readText(uri: Uri): Promise<string | null>; // null em vez de throw — chamador só filtra
}
```

Centraliza o tratamento de erro e vira o lugar único pra otimizar leitura no futuro
(ex.: ler só os primeiros bytes pra decisão rápida, streaming) sem replicar em 3 arquivos.

---

### A.3 Estratégia de aplicação do edit pós-rename

**Onde:** [`FileEditApplier.ts:26-30`](../src/infra/vscode/FileEditApplier.ts#L26-L30)

Já existe a mesma *forma* do exemplo de pagamento, só que resolvida por feature flag em vez de tipo:

```ts
if (editFilesInBackground) {
  await this.saveInBackground(uri);
} else {
  await window.showTextDocument(uri, ...);
}
```

**Abstração proposta:**

```ts
interface EditApplyStrategy {
  apply(uri: Uri): Promise<void>;
}

class BackgroundSaveStrategy implements EditApplyStrategy { /* saveInBackground */ }
class ShowEditorSaveStrategy implements EditApplyStrategy { /* window.showTextDocument */ }
```

Resolvida pelo `FeatureFlagManager` já existente. Não é ganho de performance direto — evita
que o método cresça em `if/else` quando surgir uma terceira estratégia.

---

### A.4 Cache do índice no `load()` — carregar em vez de reconstruir na ativação

**Onde:** [`NamespaceIndex.ts`](../src/infra/index/NamespaceIndex.ts) (só tem `save()`),
[`NamespaceIndexBuilder.ts`](../src/infra/index/NamespaceIndexBuilder.ts),
[`extension.ts:17-18`](../src/extension.ts#L17-L18)

Confirmado em [namespace-index.md](./namespace-index.md#how-its-built): o `namespace-index.json`
é escrito em disco a cada `save()`, mas **nunca é lido de volta** — toda ativação da extensão
reconstrói o índice do zero via scan completo do workspace (`NamespaceIndexBuilder.build()`),
mesmo quando o cache da sessão anterior ainda é válido.

**Ideia levantada na conversa:** manter o `usages: namespace -> fsPath[]` que já existe (não trocar
pra um formato namespace→namespace — perderia o `fsPath` direto, que é o que `getFilesUsing` precisa
pra editar o arquivo sem um resolve adicional), só adicionar:

```ts
// NamespaceIndex
public async load(): Promise<void> { /* lê namespace-index.json, cai em silêncio se não existir/corrompido */ }
public pruneMissing(currentPaths: Set<string>): void { /* remove entradas de arquivos que já não existem */ }
```

`extension.ts` chamaria `await namespaceIndex.load()` antes de disparar `builder.build()`
(que continua fire-and-forget, agora como *refresh* em background em vez de única fonte).

**Reconciliação — decidido:** entra dentro do `NamespaceIndexBuilder.build()`, reaproveitando a
lista que ele já busca via `workspaceIndex.execute()` — não custa uma segunda varredura, é só um
diff de `Set` contra as chaves já em memória:

```ts
// NamespaceIndexBuilder.build()
const files = await this.workspaceIndex.execute();
this.namespaceIndex.pruneMissing(new Set(files.map(f => f.fsPath))); // antes do loop de parseAndAdd
```

Não entra no `load()` — ele deve continuar sendo só um `readFile` + `JSON.parse` isolado, sem
depender do `WorkspaceIndex` pra não acoplar uma leitura de disco simples à varredura do workspace.
E não precisa de reconciliador síncrono/bloqueante separado: a janela entre `load()` terminar e
`build()` (fire-and-forget) terminar já é segura sem isso — se `getFilesUsing()` devolver um
`fsPath` fantasma nesse meio-tempo, o `try/catch` que já existe em
[`MultiFileReferenceUpdater.ts:92-114`](../src/app/services/update/MultiFileReferenceUpdater.ts#L92-L114)
em volta do `textDocumentOpener.execute()` engole o erro de arquivo inexistente e segue. O prune é
sobre não deixar lixo acumulando no `namespace-index.json` pra sempre, não é bloqueante pra correção.

---

## Contexto B — edição dentro do arquivo (save)

### B.1 Sincronização do índice — padrão repetido em 4 lugares

**Onde:**
- [`FileSavedSubscriber.ts:16-17`](../src/app/subscribers/FileSavedSubscriber.ts#L16-L17) — `parseAndAdd(document.getText())` + `save()`
- [`FileCreatedSubscriber.ts:15,20`](../src/app/subscribers/FileCreatedSubscriber.ts#L15) — `parseAndAdd(readFile)` + `save()`
- [`FileDeletedSubscriber.ts:13,15`](../src/app/subscribers/FileDeletedSubscriber.ts#L13) — `removeFile` + `save()`
- [`NamespaceIndexBuilder.ts:20,26`](../src/infra/index/NamespaceIndexBuilder.ts#L20) — `parseAndAdd` em lote + `save()` no final

Diferença real entre os quatro é só **de onde vem o texto** (documento já aberto vs. leitura de
disco) e **se é add ou remove** — a orquestração (parse → atualizar índice → persistir) é idêntica.

**Abstração proposta:**

```ts
interface IndexSyncAdapter {
  onFileChanged(fsPath: string, content: string): void; // parseAndAdd
  onFileRemoved(fsPath: string): void;                  // removeFile
}
```

Cada subscriber só resolve *de onde vem o conteúdo* (já tem via `document.getText()`, ou precisa
ler via `WorkspaceFileReader` do item A.2) e delega a sincronização + `save()` batching pro adapter.
Reduz o save individual por evento — hoje `FileCreatedSubscriber` e `FileSavedSubscriber` chamam
`save()` a cada disparo; um adapter central pode debounce isso (ver também
[namespace-index.md](./namespace-index.md#how-its-kept-up-to-date), que já documenta esse
comportamento sem debounce como está hoje).

---

## Cross-cutting — feature flags como adapter (`Feature`)

**Onde:**
- `EDIT_FILES_IN_BACKGROUND` — [`FileEditApplier.ts:14`](../src/infra/vscode/FileEditApplier.ts#L14) (já é o item A.3 acima)
- `AUTO_IMPORT_NAMESPACE` — [`FileMoveOperation.ts:36`](../src/app/operations/FileMoveOperation.ts#L36)
- `REMOVE_UNUSED_IMPORTS` — [`ImportRemover.ts:30`](../src/app/services/remove/ImportRemover.ts#L30)
- `RENAME_PROPERTIES` — [`PropertyRenameSettingsResolver.ts:25`](../src/domain/property/PropertyRenameSettingsResolver.ts#L25)

Hoje cada um desses é lido isoladamente via `FeatureFlagManager.isActive({ key })` (ou
`ConfigurationLocator.get` no caso do `RENAME_PROPERTIES`, que é polimórfico — ver comentário em
[`ConfigurationLocator.ts`](../src/domain/workspace/ConfigurationLocator.ts)) no ponto exato onde o
comportamento roda — o "liga/desliga" e o "efeito" ficam colados na classe que já faz outra coisa
(aplicar edit, importar classe, remover import, resolver settings de rename).

**Abstração proposta:**

```ts
interface Feature<Ctx> {
  isEnabled(): boolean;      // lê o ConfigKeys correspondente; default true quando não olha a config
  apply(ctx: Ctx): Promise<void>;
}
```

Cada feature vira uma classe (`AutoImportNamespaceFeature`, `RemoveUnusedImportsFeature`,
`RenamePropertiesFeature`, `EditInBackgroundFeature`) e quem orquestra roda:

```ts
for (const feature of features) {
  if (feature.isEnabled()) {
    await feature.apply(ctx);
  }
}
```

**Não cobre `IGNORED_DIRECTORIES` / `ADDITIONAL_EXTENSIONS`** ([`WorkspaceIndex.ts:33,41`](../src/infra/index/WorkspaceIndex.ts#L33), [`FileExtensionResolver.ts:32`](../src/domain/workspace/FileExtensionResolver.ts#L32)) — são parâmetros/listas que moldam a busca de arquivos, não um liga/desliga de comportamento, então continuam lidos direto via `ConfigurationLocator.get`, sem virar `Feature`.

**Trade-off:** funciona bem enquanto for 1 flag → 1 comportamento único, que é o caso hoje nos 4.
Se algum dia precisar de múltiplas implementações concorrentes pro mesmo passo (não só
ligado/desligado), o `isSupport(input)` genérico do adapter original de pagamento se encaixa
melhor que um `isEnabled()` fixo por config.

**Decidido — nem os 4 entram no `Feature`, só 2:**

Olhando [`FileMoveOperation.ts:36-40`](../src/app/operations/FileMoveOperation.ts#L36-L40), `AUTO_IMPORT_NAMESPACE`
e `REMOVE_UNUSED_IMPORTS` já são dois passos sequenciais, mesmo shape de contexto
(`{oldUri, newUri}` / `{uri}`), rodando um atrás do outro no mesmo loop por arquivo movido:

```ts
if (this.featureFlagManager.isActive({ key: ConfigKeys.AUTO_IMPORT_NAMESPACE })) {
  await this.missingClassImporter.execute({ oldUri, newUri });
}
await this.importRemover.execute({ uri: newUri }); // o próprio isEnabled-check tá dentro do ImportRemover
```

Esse é o ponto exato de montagem — só esses dois viram `Feature`, injetados como lista via
`@injectAll('MoveFileFeature')` do tsyringe (registro múltiplo sob o mesmo token, mesmo espírito
das tagged services do Symfony) direto em `FileMoveOperation`:

```ts
@injectable()
export class FileMoveOperation {
  constructor(
    ...,
    @injectAll('MoveFileFeature') private features: MoveFileFeature[],
  ) {}

  // dentro do loop por arquivo:
  for (const feature of this.features) {
    if (feature.isEnabled()) await feature.apply({ oldUri, newUri });
  }
}
```

Assim um 3º passo opcional futuro não toca em `FileMoveOperation.execute()`.

`RENAME_PROPERTIES` e `EDIT_FILES_IN_BACKGROUND` ficam de fora do `Feature`, porque não têm essa
forma de "passo opcional que roda depois":
- `RENAME_PROPERTIES` é resolvido em [`MultiFileReferenceUpdater.ts:67`](../src/app/services/update/MultiFileReferenceUpdater.ts#L67)
  **antes** do loop principal, pra decidir se o rename de propriedade é dobrado dentro do mesmo
  `WorkspaceEdit` do rename de classe — não dá pra virar um `apply()` isolado sem reintroduzir o
  segundo passe que o código já evitou de propósito (ver comentário ali).
- `EDIT_FILES_IN_BACKGROUND` não é opcional — sempre roda, só varia *como* (background vs. editor
  aberto). Continua sendo `EditApplyStrategy` (A.3), não `Feature`.

---

## Priorização sugerida

| # | Abstração | Contexto | Ganho principal | Status |
|---|---|---|---|---|
| 1 | `AffectedFilesFinder` (A.1) | A | Performance — elimina scan redundante em toda renomeação | proposto |
| 2 | `WorkspaceFileReader` (A.2) | A | Reduz duplicação, é pré-requisito pro item 1 e pro B.1 | proposto |
| 3 | Cache do índice via `load()` (A.4) | A | Performance de ativação — evita full scan toda vez que o VS Code abre | proposto (reconciliação decidida: `pruneMissing` dentro do `build()`) |
| 4 | `IndexSyncAdapter` (B.1) | B | Manutenibilidade + abre espaço pra debounce do `save()` | proposto |
| 5 | `EditApplyStrategy` (A.3) | A | Manutenibilidade | proposto |
| 6 | `Feature` só pra `AUTO_IMPORT_NAMESPACE`/`REMOVE_UNUSED_IMPORTS` (Cross-cutting) | A (hoje) | Manutenibilidade — `FileMoveOperation` some com o `if/if` fixo | proposto (`RENAME_PROPERTIES` e `EDIT_FILES_IN_BACKGROUND` ficam fora) |
