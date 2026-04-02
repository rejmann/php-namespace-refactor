# ClassRenameOperation

**Arquivo:** `src/app/operations/ClassRenameOperation.ts`

## Responsabilidade

Executada quando o usuário pressiona F2 com o cursor sobre a linha de declaração da classe (`class Foo`, `interface Foo`, `trait Foo`) e digita um novo nome.

## Fluxo

```
F2 (comando registrado)
  → RenameHandler.handle()
  → RenameFeature.execute()
  → detecta ClassType no cursor
  → ClassRenameOperation.execute()  ← aqui
  → FileRenameHandler.create()      ← aciona WorkspaceEdit.renameFile()
  → onDidRenameFiles                ← dispara FileMoveOperation
```

## O que faz

Constrói o novo `Uri` mantendo o mesmo diretório, substituindo apenas o nome do arquivo pelo novo nome da classe:

```
/src/Domain/OldClass.php  →  /src/Domain/NewClass.php
```

Em seguida, delega o rename ao `FileRenameHandler.create()`, que dispara o evento `onDidRenameFiles` do VS Code — o qual aciona o `FileMoveOperation` para:

- Atualizar a declaração `namespace` no arquivo
- Atualizar o nome da classe no arquivo (via `ClassNameUpdater`)
- Atualizar todos os `use` statements que referenciam a classe em todo o projeto

## Diferença em relação à FileRenameOperation

Ambas produzem o mesmo resultado final (rename de arquivo no mesmo diretório). A distinção é semântica:

- `ClassRenameOperation` — intenção do usuário é **renomear a classe/interface/trait**
- `FileRenameOperation` — intenção é **renomear o arquivo**

## Dependências

- `WorkspacePathResolver` — extrai diretório e extensão do path atual
- `FileRenameHandler` — executa o rename via VS Code WorkspaceEdit API
