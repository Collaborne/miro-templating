# miro-templating

[Miro.com](https://www.miro.com) is an online whiteboard for visual collaboration. It comes with a great UI to build and collaborate canvases. Miro offers as well an API to programmatically create new boards.

This library allows the templating of Miro boards:
- Create new boards via the Miro API based on a JSON template - including placeholders that are replaced during board creation
- Query specific user created data within the Miro board, e.g. ideas posted in a specific box within the Miro board

The repository contains as well tools to create & test the templates.

This [blog post](https://medium.com/collaborne-engineering/templating-miro-com-boards-bac21271a7d9?source=friends_link&sk=b8b423bedec60517dd766f4ac7b87561) provides further information about the aim of this library.

## Install

### Prerequisites

Ensure you have installed:

* [Git client](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
* [Node & npm](https://nodejs.org/en/)
* Sign up for a miro.com account

### Install tools

Install the tools via npm:
```bash
git clone https://github.com/Collaborne/miro-templating
npm install
```

### Create Miro token

Following [Miro documentation](https://developers.miro.com/docs/getting-started) and create an access token with these permissions:
* boards:read
* boards:write

Also note the `Client id` as you will need it later on (`MIRO_CLIENT_ID`).

## Usage

### Overview

The Miro API supports only a subset of the features exposed in the Miro UI (e.g. labels aren't available via the API). It's therefore an iterative process of creating a Miro template that looks good and works via the API.

The overall process is:
1. Create your ideal Miro board via the Miro UI
2. Auto-create a template based on the Miro board
3. Create a new Miro board based on the template
4. Review the created board in the Miro UI
5. Remove/adjust parts in the template that don't work via the API
6. Repeat steps 2-5 until the template looks good

### Auto-generate template from Miro

Use this command to create a new template based on an existing Miro board:
```bash
MIRO_TOKEN=<TOKEN> BOARD_ID=<BOARD_ID> TEMPLATE_ID=<TEMPLATE_ID> npm run create-template
```

The command states the path where the template was created.

| Parameters | Explanation |
| ---------- | ----------- |
| BOARD_ID | You find the board-ID in the URL of your Miro board: `https://miro.com/app/board/a2J_kuG_mO0=/` => BOARD_ID is `a2J_kuG_mO0=`<br>**The board must be in the same Miro team that was choosen when creating the Miro token!** |
| TEMPLATE_ID | ID of how to name your template, e.g. `test` |

You can rerun the tool to update the widgets. The tool won't overwrite your configured name, etc. in the template.

### Create Miro board from template

Use this command to create a Miro board based on a template:

```bash
MIRO_TOKEN=<TOKEN> MIRO_CLIENT_ID=<CLIENT_ID> TEMPLATE_ID=<TEMPLATE_ID> npm run create-board
```

| Parameters | Explanation |
| ---------- | ----------- |
| MIRO_CLIENT_ID | ID of the Miro client, e.g. `1234567890123456789` |
| TEMPLATE_ID | ID of how to name your template, e.g. `test` |

## Templating

### Markdown

The tools converts HTML content into markdown and back. This eases the translation of templates.

Be aware that HTML -> markdown -> HTML conversion can lead to data loss because markdown can't represent the same richness as HTML.

### Placeholders

You can use placeholders in the templates. These placeholders are filled at the time when the Miro board is created.

The following template snippet includes the project name into the text of the widget:

```json
{
  "widgets": [
    {
      "type": "shape",
      "text": "Board for ${PROJECT_NAME}",
```

The value of the placeholder is extracted from the file [sample/context.json](sample/context.json). This is for testing only. In production usage, set these values programmatically.

## Query texts from Miro board

`miro-templating` allows to query back data entered into a Miro board. For this, target areas can be marked via [Miro's metadata](https://developers.miro.com/reference#application-metadata). All texts within this target area are queried (incl. the text in the target area itself). For example, you could define a box and get the text of all stickies within this box returned.

### Define target areas for querying

To declare target area, add the field `metadata` with the `import_type`. For example, the following template declares a target area:

```json
{
  "widgets": [
    {
      "type": "shape",
      "metadata": {
        "${APP_ID}": {
          "import_type": "idea"
        }
      }
```

You can define multiple target areas in a template. These can have the same - or different - values for `import_type`.

Good to know:
* The placeholder `${APP_ID}` is automatically replaced with your Miro client ID when creating the board. It's necessary to use the Miro client ID (= `APP_ID`) when creating the board and when querying it.
* The query logic supports currently only rectangular target areas.
* **The metadata markers are stored in Miro. This means that querying is only going to work with Miro boards that were newly created with the template. In other words: you cannot add metadata markers to existing Miro boards!**

### Query target areas

Use this command to create a Miro board based on a template:

```bash
MIRO_TOKEN=<TOKEN> MIRO_CLIENT_ID=<CLIENT_ID> BOARD_ID=<BOARD_ID> npm run query-board
```

| Parameters | Explanation |
| ---------- | ----------- |
| MIRO_CLIENT_ID | ID of the Miro client, e.g. `1234567890123456789` |
| BOARD_ID | You find the board-ID in the URL of your Miro board: `https://miro.com/app/board/a2J_kuG_mO0=/` => BOARD_ID is `a2J_kuG_mO0=` |

All results are marked with the `import_type` of the target area:
```
{
  hits: [
    { type: 'idea', value: 'Idea 1' },
    { type: 'idea', value: 'Idea 2' }
  ]
}
```

## FAQ

### Why do I get errors from the Miro API when creating a board based on an imported board?

The Miro API supports only a subset of the UI features (e.g. transparent borders exists only in the UI). Additionally, the Miro API exports JSON that sometimes isn't support by the Miro create API (e.g. Miro export contains widgets with `borderWidth=1` wheras Miro create API forbids `borderWidth=1`).

If you encounter one of these situations:
1. Understand from the Miro API error which widget/field causes the issue
2. Adjust the template accordingly for this widget to prevent the error
3. Try again to create the board

Example: you can emulate a transparent border by setting `borderWidth=0` or by setting color to white (if it's shown on a white background).

The Miro API community is a great starting point to investigate these situations: https://community.miro.com/search/index?tags%5B0%5D=api

## Others

Miro is a trademark registered by RealtimeBoard, Inc.
