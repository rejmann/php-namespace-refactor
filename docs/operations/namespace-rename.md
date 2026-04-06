# NamespaceRenameOperation

**Arquivo:** `src/app/operations/NamespaceRenameOperation.ts`

## Responsabilidade

Executada quando o usuário pressiona F2 com o cursor sobre a linha `namespace Foo\Bar;` e digita um novo namespace.

## Fluxo

```
F2 (comando registrado)
  → RenameHandler.handle()
  → RenameFeature.execute()
  → detecta NamespaceType no cursor
  → NamespaceRenameOperation.execute()  ← aqui
  → FileRenameHandler.create()          ← aciona WorkspaceEdit.renameFile()
  → onDidRenameFiles                    ← dispara FileMoveOperation
```

## O que faz

1. Extrai o nome da classe a partir do path atual (ex.: `UserController`)
2. Resolve o novo namespace para o diretório correspondente via PSR-4:

```
App\Services\Auth  →  /src/Services/Auth
```

3. Constrói o novo `Uri`:

```
/src/Domain/UserController.php  →  /src/Services/Auth/UserController.php
```

4. Delega ao `FileRenameHandler.create()`, que aciona o `FileMoveOperation` para atualizar namespace e referências em todo o projeto.

## Comportamento de erro

Se o namespace informado não tiver mapeamento PSR-4 no `composer.json`, exibe uma mensagem de erro via `window.showErrorMessage` e aborta a operação.

## Dependências

- `WorkspacePathResolver` — resolve namespace → diretório e extrai o nome da classe do path atual
- `FileRenameHandler` — executa o rename via VS Code WorkspaceEdit API
