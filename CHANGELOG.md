# Change Log

All notable changes to the "vuejs-autoimport" extension will be documented in this file.

## 1.0.5 | 2020-09-26
Various bug fixes + Vue 3 TypeScript support
- added support for the Vue 3 TypeScript syntax using defineComponent()
- fixed: extension doesn't indent the import statement even with the Indent Script Tag option enabled
- fixed: leaves empty new line after the components object with Insert One Component Per Line enabled
- fixed: doesn't add comma after the components object when Has Trailing Comma is disabled
    - now it adds comma when there are other properties in the component's object (e.g. computed, methods,...)

## 1.0.4 | 2020-01-05
- update command title.
- change keybindings 'cmd + /' to 'cmd + i'.
- fix to show context menu when only vue file.

## 1.0.3 | 2019-10-27

- add option to remove .vue file extention from import path.
- fix a minor bug.
- resolved security alerts for github.com.

## 1.0.2 | 2019-4-27

- add semicolon after imports (default: off)
- one component per line (default: off)
- script tag is indented (gives one extra indent, default: off)
- force pascal case (while you're kinda not supposed to do that according to vue convention, naming component files in kebab case would break things. default: on)
- add trailing comma (default: off)
- auto add `compornets{}` block.

## 1.0.1 | 2018-11-23

- Fixed to accurately import path if component exist in just under directory.
- Added to can import on `<component`. \* it needed to close at `>` until now.

## 1.0.0 | 2018-11-3

- add support on end "," word in components.

## 0.0.2 | 2018-10-30

- Changed to key command
- Fixed to key for get config value
- FIxed to import path on same layer

## 0.0.1 | 2018-10-28

- Initial release
