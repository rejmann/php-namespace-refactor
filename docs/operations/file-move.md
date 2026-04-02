# FileMoveOperation

**Arquivo:** `src/app/operations/FileMoveOperation.ts`

## Responsabilidade

Executada quando o usuário arrasta um arquivo `.php` para outro diretório no VS Code Explorer.

## Fluxo

```
onDidRenameFiles (VS Code event)
  → FileRenameHandler.handle()
  → FileMoveOperation.execute(files)
```

## O que faz

1. Filtra apenas arquivos `.php` (ignora outros tipos)
2. Atualiza a declaração `namespace` no arquivo movido via `NamespaceBatchUpdater`
3. Atualiza todas as referências (`use` statements) no projeto inteiro
4. **(Opcional)** Auto-importa classes do diretório de origem que são usadas no arquivo movido
5. **(Opcional)** Remove imports que se tornaram desnecessários após a movimentação

## Feature flags

| Flag | Comportamento |
|---|---|
| `autoImportNamespace` | Ativa o passo 4 (auto-import de classes do diretório antigo) |
| `removeUnusedImports` | Ativa o passo 5 (remoção de imports obsoletos) |

## Dependências

- `NamespaceBatchUpdater` — orquestra a atualização do namespace e das referências
- `MissingClassImporter` — detecta e injeta imports faltando
- `ImportRemover` — remove imports não utilizados
- `FeatureFlagManager` — verifica quais features estão ativas nas configurações
