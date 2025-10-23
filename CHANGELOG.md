# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.6.2](https://github.com/rejmann/php-namespace-refactor/compare/php-namespace-refactor-v1.6.1...php-namespace-refactor-v1.6.2) (2025-10-23)


### 🐛 Bug Fixes

* always log rename command even if disabled ([ff77a7b](https://github.com/rejmann/php-namespace-refactor/commit/ff77a7b92c12aec8ad1732efc213a667f858b541))
* if the rename type is class do not allow backslashes ([c5a1070](https://github.com/rejmann/php-namespace-refactor/commit/c5a1070504787d1125e4808e7fe2c9d85fb40093))


### ⚡ Performance Improvements

* ignore if new file extension changes ([2aae40d](https://github.com/rejmann/php-namespace-refactor/commit/2aae40dd14e07b71b60b1ebbb0913d2658690faf))


### ♻️ Code Refactoring

* unnecessary constants ([ff13d01](https://github.com/rejmann/php-namespace-refactor/commit/ff13d017503caa12081e990886876312c4cf1c77))


### 🔧 Chores

* eslint - sort imports and indentation ([d131447](https://github.com/rejmann/php-namespace-refactor/commit/d13144705c8b93b3f897dd40c1d29577dc2ebd1f))
* indentation ([c9082a4](https://github.com/rejmann/php-namespace-refactor/commit/c9082a40c87055274654e489262925903aa0f7be))

## [1.6.1](https://github.com/rejmann/php-namespace-refactor/compare/php-namespace-refactor-v1.6.0...php-namespace-refactor-v1.6.1) (2025-10-21)


### 🐛 Bug Fixes

* renaming class does not update class name ([a3e40ff](https://github.com/rejmann/php-namespace-refactor/commit/a3e40ff046b08ceaa83affcdf73231380e8bf0fe))

## [1.6.0](https://github.com/rejmann/php-namespace-refactor/compare/php-namespace-refactor-v1.5.0...php-namespace-refactor-v1.6.0) (2025-10-20)


### 🚀 New Features

* edit namespace or class name within the editor and also refactor in the project ([e7fae62](https://github.com/rejmann/php-namespace-refactor/commit/e7fae622f2a04809388e340c730e5bae458bee7c))

## [1.5.0](https://github.com/rejmann/php-namespace-refactor/compare/php-namespace-refactor-v1.4.0...php-namespace-refactor-v1.5.0) (2025-10-19)


### 🚀 New Features

* rename file and also refactor namespace ([05e6769](https://github.com/rejmann/php-namespace-refactor/commit/05e676936f49522302f0d2ee363f2256c1de8485))


### 🔧 Chores

* makefile ([6958ab9](https://github.com/rejmann/php-namespace-refactor/commit/6958ab9629db5d654ba9051c4ab208e6821ebb75))

## [1.4.0](https://github.com/rejmann/php-namespace-refactor/compare/php-namespace-refactor-v1.3.2...php-namespace-refactor-v1.4.0) (2025-10-15)


### 🚀 New Features

* dedicated event ([3e1e716](https://github.com/rejmann/php-namespace-refactor/commit/3e1e7162d772dbe2d4c4d82e0d6c5e97fe425dba))
* dependecy injection ([f26727e](https://github.com/rejmann/php-namespace-refactor/commit/f26727e1ecc2a77029eb5260fa3b94b46b57202f))


### 🐛 Bug Fixes

* security package ([e959f25](https://github.com/rejmann/php-namespace-refactor/commit/e959f255728c688a92f8b5abf4780aaab676edd7))


### ♻️ Code Refactoring

* from function to object ([7c0cb1e](https://github.com/rejmann/php-namespace-refactor/commit/7c0cb1e740f37cbfe740c944288ce0ca23593261))

## [1.3.2](https://github.com/rejmann/php-namespace-refactor/compare/php-namespace-refactor-v1.3.1...php-namespace-refactor-v1.3.2) (2025-08-28)


### 🔧 Chores

* pr title and description ([ec7d7b1](https://github.com/rejmann/php-namespace-refactor/commit/ec7d7b1e1fe9fd42b9f2a6559d615810fe61204e))

## [1.3.1](https://github.com/rejmann/php-namespace-refactor/compare/php-namespace-refactor-v1.3.0...php-namespace-refactor-v1.3.1) (2025-08-28)


### 🔧 Chores

* section perf ([2f30e8f](https://github.com/rejmann/php-namespace-refactor/commit/2f30e8f965250dec62091c5dbfd43cec06d7297f))
* type node ([6cc8b1b](https://github.com/rejmann/php-namespace-refactor/commit/6cc8b1bf6d495017c94d4240c2e10cc94a4c7224))

## [1.3.0](https://github.com/rejmann/php-namespace-refactor/compare/php-namespace-refactor-v1.2.1...php-namespace-refactor-v1.3.0) (2025-08-28)


### 🚀 New Features

* allow disable/enable features ([efd1214](https://github.com/rejmann/php-namespace-refactor/commit/efd12149b3c7263bb8bbee1c7feb4ec374d7386d))
* allow specifying additional extensions for namespace refactor ([24d035c](https://github.com/rejmann/php-namespace-refactor/commit/24d035c623d6d59d7f26fe5019681879a2911f9a))
* auto import classes from current object when changing its directory ([442cc7d](https://github.com/rejmann/php-namespace-refactor/commit/442cc7d910fec706dfc589ab0569fa6ed0f0e643))
* remove unused imports ([69e18ea](https://github.com/rejmann/php-namespace-refactor/commit/69e18ea03fd7c5bbd95e3406de109036ea8b45ff))
* update namespace in files ([b0c6269](https://github.com/rejmann/php-namespace-refactor/commit/b0c62695cdbfb8bb28056a5bee16e7bbc6b46de4))


### 🐛 Bug Fixes

* auto import from the same directory ([75a4324](https://github.com/rejmann/php-namespace-refactor/commit/75a4324376a29456629e20336a58b33d3bccbe4c))
* consider compound namespace ([f80eabf](https://github.com/rejmann/php-namespace-refactor/commit/f80eabfd6ce528235cbdc12e6d7419d65f908a7e))
* do not auto import the class itself ([301ccf8](https://github.com/rejmann/php-namespace-refactor/commit/301ccf8154fe15907cd5764fdf6ce54c1ed752b7))
* generate namespace ([e8c3622](https://github.com/rejmann/php-namespace-refactor/commit/e8c3622f39844344a00dfc3c642d28841ef3e8f4))
* handle file not found errors and improve performance ([96122da](https://github.com/rejmann/php-namespace-refactor/commit/96122da31c5c4db2e68acecf4174bfb05503c8b4))
* ignore own file ([08822d0](https://github.com/rejmann/php-namespace-refactor/commit/08822d07e60249b3c6fa71025543baf947e09a94))
* refactor just if is project with php ([4ee277c](https://github.com/rejmann/php-namespace-refactor/commit/4ee277c5146332f04d286dda634e665d5a563ff7))
* replace entire namespace line to avoid half replacement ([8dc0ee1](https://github.com/rejmann/php-namespace-refactor/commit/8dc0ee19bce1290f6fe953b11d08edeeeab19791))
* when there is no use statement ([4f4c2c2](https://github.com/rejmann/php-namespace-refactor/commit/4f4c2c24900f851504682c149a3bb44ca75817fa))


### 📚 Documentation

* CHANGELOG.md ([ea573f9](https://github.com/rejmann/php-namespace-refactor/commit/ea573f9b4916fb80e34ea7e8dc8cf0a6f5140573))
* command without ([9432f79](https://github.com/rejmann/php-namespace-refactor/commit/9432f795d93136a1165dee727752e86ffdcbf8b6))
* documentation of app ([4654086](https://github.com/rejmann/php-namespace-refactor/commit/46540861718abc71f0b03893ab7a628236626bd9))
* english ([d2ea322](https://github.com/rejmann/php-namespace-refactor/commit/d2ea3226f33537dc69905322399b76b57623274e))
* fix display name ([46c9022](https://github.com/rejmann/php-namespace-refactor/commit/46c90222865ddfa7e5f80761c395c0f5daf780bb))
* remove double quote description ([c25fd89](https://github.com/rejmann/php-namespace-refactor/commit/c25fd89bb49f70f2d3ae0fc2b422bafc289adf85))
* update readme ([b996d56](https://github.com/rejmann/php-namespace-refactor/commit/b996d56dae931709d3987d0e16d0c7adf4ff0772))
* update readme ([22a7532](https://github.com/rejmann/php-namespace-refactor/commit/22a75322e765f234138d2dbb436279015585ebda))
* update readme ([c48434f](https://github.com/rejmann/php-namespace-refactor/commit/c48434f8bcd5d9ef7025391b2ea8260a4af1c337))
* update readme ([a01900c](https://github.com/rejmann/php-namespace-refactor/commit/a01900c84120bd841425020c45b35c70d41be3fe))


### 💄 Styles

* eslint ([f94c2b8](https://github.com/rejmann/php-namespace-refactor/commit/f94c2b85a74431b0cdea0940adbf748cbda7c495))


### ♻️ Code Refactoring

* const to regex ([eaae44c](https://github.com/rejmann/php-namespace-refactor/commit/eaae44ca6542058c741312013d2a619271edc9b1))
* const WORKSPACE_ROOT ([1c44457](https://github.com/rejmann/php-namespace-refactor/commit/1c44457d3209f0cc43acee42e20dcbae514f3df5))
* restructure project ([4081a57](https://github.com/rejmann/php-namespace-refactor/commit/4081a5757af7358412c2550497911042c7bb9ee3))


### 🔧 Chores

* .gitignore ([c72123b](https://github.com/rejmann/php-namespace-refactor/commit/c72123b0d828fe78f841f2a7f2f6d7fd869bf53e))
* // eslint-disable-line ([75323fe](https://github.com/rejmann/php-namespace-refactor/commit/75323fe88f0c548547c5f9801a065a069fbced0a))
* a file is missing ([1028e53](https://github.com/rejmann/php-namespace-refactor/commit/1028e53b9b919358c1685733fd3ccc2830dd6215))
* **deps-dev:** bump esbuild from 0.24.2 to 0.25.0 ([cdc586a](https://github.com/rejmann/php-namespace-refactor/commit/cdc586a83587050a5afe4443d99da471b934d399))
* **deps-dev:** bump form-data from 4.0.2 to 4.0.4 ([b4c5c5a](https://github.com/rejmann/php-namespace-refactor/commit/b4c5c5ab36f77870e108ddcc03a715a6da09f2f7))
* **deps-dev:** bump tar-fs from 2.1.2 to 2.1.3 ([5e6e9ae](https://github.com/rejmann/php-namespace-refactor/commit/5e6e9aed3a4a0b8ebaccb6e584e37b9094b796cb))
* **deps-dev:** bump tmp from 0.2.3 to 0.2.5 ([4d89f3d](https://github.com/rejmann/php-namespace-refactor/commit/4d89f3dd93a22c5b0036c24f1de7388bc7f1eae5))
* **deps-dev:** bump undici from 6.21.1 to 6.21.3 ([9a8e28e](https://github.com/rejmann/php-namespace-refactor/commit/9a8e28eca9db509c99bd76897903064a77d65eea))
* disable extensions ([fde66c9](https://github.com/rejmann/php-namespace-refactor/commit/fde66c99830623dc85d7ed48eb9355ca9c0fd7e4))
* eslint disabled for console ([0d818a8](https://github.com/rejmann/php-namespace-refactor/commit/0d818a834d56db64af859ef6e9ef35a463d83280))
* github actions ([38745bd](https://github.com/rejmann/php-namespace-refactor/commit/38745bd76b9240443253cc35cdcd6715ca76fe02))
* github actions ([2e46412](https://github.com/rejmann/php-namespace-refactor/commit/2e4641219ca4b82fbee689b717caeb676a423ef9))
* icon ([8df94a5](https://github.com/rejmann/php-namespace-refactor/commit/8df94a5bcadc032b1724980cfdaaf91809ba7175))
* icon & rename project ([7d116dd](https://github.com/rejmann/php-namespace-refactor/commit/7d116dd60e1f8548f5eec9a90426d9748cd37032))
* improv ([2727175](https://github.com/rejmann/php-namespace-refactor/commit/2727175002ab5a108947a474b54c2345f26b20a1))
* is already namespaced ([6953e47](https://github.com/rejmann/php-namespace-refactor/commit/6953e470a861d9c7ece7fd75253f1e35fd976ec0))
* more context ([9053935](https://github.com/rejmann/php-namespace-refactor/commit/9053935654410d8af84d5f51cfb90e81d59a9080))
* need the manifest ([3b79958](https://github.com/rejmann/php-namespace-refactor/commit/3b79958d1f0a222e88f3d39287571f85d2fd38f6))
* one less script ([2082a61](https://github.com/rejmann/php-namespace-refactor/commit/2082a610c28b04ff197ef1a8e041efa6e539f5fc))
* release:pack ([7386134](https://github.com/rejmann/php-namespace-refactor/commit/7386134f51fe35aa8b041e0ee3e8debb27789de8))
* **release:** 0.0.2 ([5a30b39](https://github.com/rejmann/php-namespace-refactor/commit/5a30b393c1b706fb41cb3d5fdd86e1c1ddcf7575))
* **release:** 0.0.3 ([618549d](https://github.com/rejmann/php-namespace-refactor/commit/618549da8f9fdbbb94277a2ebce787406783ac20))
* **release:** 0.0.3 ([ba8a2ce](https://github.com/rejmann/php-namespace-refactor/commit/ba8a2cedf4ae0c53726ad453509ab73644014586))
* **release:** 0.0.4 ([5f52838](https://github.com/rejmann/php-namespace-refactor/commit/5f5283877abd83206fcac48e7d4dcef8c293a918))
* **release:** 0.0.5 ([9a3ed7f](https://github.com/rejmann/php-namespace-refactor/commit/9a3ed7f34f49d226eb5ab1eb6042429298e23dca))
* **release:** 0.0.6 ([fe822d7](https://github.com/rejmann/php-namespace-refactor/commit/fe822d769927633394f47003654dba00a35c32bb))
* **release:** 0.0.7 ([b0dc974](https://github.com/rejmann/php-namespace-refactor/commit/b0dc974b6e0db957308ac3d2e669bcf826c392ab))
* **release:** 0.0.8 ([f80e969](https://github.com/rejmann/php-namespace-refactor/commit/f80e96925203840a8a13a5038506727ca47a9692))
* **release:** 1.0.8 ([9a26a5d](https://github.com/rejmann/php-namespace-refactor/commit/9a26a5d1483652c09c3e0b7d3dd93ad4e28c9154))
* **release:** 1.1.10 ([1d49864](https://github.com/rejmann/php-namespace-refactor/commit/1d49864d08309e63444245574e3913a222c0743f))
* **release:** 1.1.11 ([2437530](https://github.com/rejmann/php-namespace-refactor/commit/24375302633f8aa637fbaa09895f33ac593aa8dc))
* **release:** 1.1.12 ([c166dd9](https://github.com/rejmann/php-namespace-refactor/commit/c166dd9dc122aa30f555482cab5c8b0087d7915b))
* **release:** 1.1.9 ([e9eee74](https://github.com/rejmann/php-namespace-refactor/commit/e9eee74787ec8ab4efaaa194b881db85868b4ed0))
* **release:** 1.2.0 ([e2f6832](https://github.com/rejmann/php-namespace-refactor/commit/e2f6832f00a143d162efbc5671379e09b0a065d2))
* **release:** 1.2.1 ([bc355d7](https://github.com/rejmann/php-namespace-refactor/commit/bc355d76e64488bc683db294f573d31a0202e475))
* remove "node_modules" from index and add to .gitignore ([2a598da](https://github.com/rejmann/php-namespace-refactor/commit/2a598daa8e38b34738c431c94106a99729e4432b))
* remove comments ([0221470](https://github.com/rejmann/php-namespace-refactor/commit/02214708365b32e97140ed5d1f8798ef712ad58d))
* starting project ([9fc60d0](https://github.com/rejmann/php-namespace-refactor/commit/9fc60d03a8590e0f37d191c928aaaeb81abee75e))
* style if ([b5142ad](https://github.com/rejmann/php-namespace-refactor/commit/b5142adfb32496af1e1fd32f22062a9a2a9f6aea))
* versionrs ([74ceb23](https://github.com/rejmann/php-namespace-refactor/commit/74ceb238accafb391be21d8b50abe3d167fddf8e))
* versionrs (2) ([933c0a7](https://github.com/rejmann/php-namespace-refactor/commit/933c0a7759ff97f35866ec1cb09244bf72b6bec3))
* vsce & icon ([9c07154](https://github.com/rejmann/php-namespace-refactor/commit/9c07154ca65b0532d2ee17c44becb07e71a005e5))

### [1.2.1](https://github.com/rejmann/php-namespace-refactor/compare/v1.2.0...v1.2.1) (2025-08-27)

## 1.2.0 (2025-08-11)


### ✨ Features

* allow disable/enable features ([efd1214](https://github.com/rejmann/php-namespace-refactor/commit/efd12149b3c7263bb8bbee1c7feb4ec374d7386d))
* allow specifying additional extensions for namespace refactor ([24d035c](https://github.com/rejmann/php-namespace-refactor/commit/24d035c623d6d59d7f26fe5019681879a2911f9a))
* auto import classes from current object when changing its directory ([442cc7d](https://github.com/rejmann/php-namespace-refactor/commit/442cc7d910fec706dfc589ab0569fa6ed0f0e643))
* remove unused imports ([69e18ea](https://github.com/rejmann/php-namespace-refactor/commit/69e18ea03fd7c5bbd95e3406de109036ea8b45ff))
* update namespace in files ([b0c6269](https://github.com/rejmann/php-namespace-refactor/commit/b0c62695cdbfb8bb28056a5bee16e7bbc6b46de4))


### ♻️ Refactor

* const to regex ([eaae44c](https://github.com/rejmann/php-namespace-refactor/commit/eaae44ca6542058c741312013d2a619271edc9b1))
* const WORKSPACE_ROOT ([1c44457](https://github.com/rejmann/php-namespace-refactor/commit/1c44457d3209f0cc43acee42e20dcbae514f3df5))
* restructure project ([4081a57](https://github.com/rejmann/php-namespace-refactor/commit/4081a5757af7358412c2550497911042c7bb9ee3))


### 🐛 Bug Fixes

* auto import from the same directory ([75a4324](https://github.com/rejmann/php-namespace-refactor/commit/75a4324376a29456629e20336a58b33d3bccbe4c))
* consider compound namespace ([f80eabf](https://github.com/rejmann/php-namespace-refactor/commit/f80eabfd6ce528235cbdc12e6d7419d65f908a7e))
* do not auto import the class itself ([301ccf8](https://github.com/rejmann/php-namespace-refactor/commit/301ccf8154fe15907cd5764fdf6ce54c1ed752b7))
* generate namespace ([e8c3622](https://github.com/rejmann/php-namespace-refactor/commit/e8c3622f39844344a00dfc3c642d28841ef3e8f4))
* ignore own file ([08822d0](https://github.com/rejmann/php-namespace-refactor/commit/08822d07e60249b3c6fa71025543baf947e09a94))
* refactor just if is project with php ([4ee277c](https://github.com/rejmann/php-namespace-refactor/commit/4ee277c5146332f04d286dda634e665d5a563ff7))
* replace entire namespace line to avoid half replacement ([8dc0ee1](https://github.com/rejmann/php-namespace-refactor/commit/8dc0ee19bce1290f6fe953b11d08edeeeab19791))
* when there is no use statement ([4f4c2c2](https://github.com/rejmann/php-namespace-refactor/commit/4f4c2c24900f851504682c149a3bb44ca75817fa))
