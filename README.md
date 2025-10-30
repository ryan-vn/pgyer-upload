pgyer-upload
=================

构建应用包上传pgy应用分发平台


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/pgyer-upload.svg)](https://npmjs.org/package/pgyer-upload)
[![Downloads/week](https://img.shields.io/npm/dw/pgyer-upload.svg)](https://npmjs.org/package/pgyer-upload)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g pgyer-upload
$ pgyer-upload COMMAND
running command...
$ pgyer-upload (--version)
pgyer-upload/0.0.1 darwin-arm64 node-v22.15.0
$ pgyer-upload --help [COMMAND]
USAGE
  $ pgyer-upload COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`pgyer-upload help [COMMAND]`](#pgyer-upload-help-command)
* [`pgyer-upload plugins`](#pgyer-upload-plugins)
* [`pgyer-upload plugins add PLUGIN`](#pgyer-upload-plugins-add-plugin)
* [`pgyer-upload plugins:inspect PLUGIN...`](#pgyer-upload-pluginsinspect-plugin)
* [`pgyer-upload plugins install PLUGIN`](#pgyer-upload-plugins-install-plugin)
* [`pgyer-upload plugins link PATH`](#pgyer-upload-plugins-link-path)
* [`pgyer-upload plugins remove [PLUGIN]`](#pgyer-upload-plugins-remove-plugin)
* [`pgyer-upload plugins reset`](#pgyer-upload-plugins-reset)
* [`pgyer-upload plugins uninstall [PLUGIN]`](#pgyer-upload-plugins-uninstall-plugin)
* [`pgyer-upload plugins unlink [PLUGIN]`](#pgyer-upload-plugins-unlink-plugin)
* [`pgyer-upload plugins update`](#pgyer-upload-plugins-update)
* [`pgyer-upload upload [FILE]`](#pgyer-upload-upload-file)

## `pgyer-upload help [COMMAND]`

Display help for pgyer-upload.

```
USAGE
  $ pgyer-upload help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for pgyer-upload.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.34/src/commands/help.ts)_

## `pgyer-upload plugins`

List installed plugins.

```
USAGE
  $ pgyer-upload plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ pgyer-upload plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/index.ts)_

## `pgyer-upload plugins add PLUGIN`

Installs a plugin into pgyer-upload.

```
USAGE
  $ pgyer-upload plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into pgyer-upload.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the PGYER_UPLOAD_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the PGYER_UPLOAD_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ pgyer-upload plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ pgyer-upload plugins add myplugin

  Install a plugin from a github url.

    $ pgyer-upload plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ pgyer-upload plugins add someuser/someplugin
```

## `pgyer-upload plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ pgyer-upload plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ pgyer-upload plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/inspect.ts)_

## `pgyer-upload plugins install PLUGIN`

Installs a plugin into pgyer-upload.

```
USAGE
  $ pgyer-upload plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into pgyer-upload.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the PGYER_UPLOAD_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the PGYER_UPLOAD_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ pgyer-upload plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ pgyer-upload plugins install myplugin

  Install a plugin from a github url.

    $ pgyer-upload plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ pgyer-upload plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/install.ts)_

## `pgyer-upload plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ pgyer-upload plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ pgyer-upload plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/link.ts)_

## `pgyer-upload plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ pgyer-upload plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ pgyer-upload plugins unlink
  $ pgyer-upload plugins remove

EXAMPLES
  $ pgyer-upload plugins remove myplugin
```

## `pgyer-upload plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ pgyer-upload plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/reset.ts)_

## `pgyer-upload plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ pgyer-upload plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ pgyer-upload plugins unlink
  $ pgyer-upload plugins remove

EXAMPLES
  $ pgyer-upload plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/uninstall.ts)_

## `pgyer-upload plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ pgyer-upload plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ pgyer-upload plugins unlink
  $ pgyer-upload plugins remove

EXAMPLES
  $ pgyer-upload plugins unlink myplugin
```

## `pgyer-upload plugins update`

Update installed plugins.

```
USAGE
  $ pgyer-upload plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.51/src/commands/plugins/update.ts)_

## `pgyer-upload upload [FILE]`

Upload iOS / Android / HarmonyOS builds to PGYER

```
USAGE
  $ pgyer-upload upload [FILE] [-k <value>] [-t <value>] [-p <value>] [-d <value>] [-j] [-c <value>] [-i]
    [-a]

ARGUMENTS
  [FILE]  ipa/apk/hap file path (optional if configured)

FLAGS
  -a, --auto              Auto-detect build files
  -c, --config=<value>    Path to config file (.env)
  -d, --desc=<value>      Build update description
  -i, --init              Initialize project configuration
  -j, --json              Output full JSON response
  -k, --apiKey=<value>    PGYER API Key
  -p, --password=<value>  Install password if type=2
  -t, --type=<value>      Install type (1=public,2=password,3=invite)

DESCRIPTION
  Upload iOS / Android / HarmonyOS builds to PGYER
```

_See code: [src/commands/upload.ts](https://github.com/cli/pgyer-upload/blob/v0.0.1/src/commands/upload.ts)_
<!-- commandsstop -->
