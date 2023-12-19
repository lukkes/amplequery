(() => {
  // lib/plugin.js
  var plugin = {
    insertText: {
      "Empty": async function(app) {
        try {
          console.log("Starting amplequery: empty branch...");
          const result = await app.prompt(
            "Looking for empty notes. Should I mark them for deletion?",
            {
              inputs: [
                {
                  "type": "radio",
                  "options": [
                    {
                      label: "Mark for deletion",
                      value: true
                    },
                    {
                      label: "Just show me the results",
                      value: false
                    }
                  ]
                }
              ]
            }
          );
          console.log(`User chose mark for deletion option: ${result}`);
          app.alert("Please wait. For large notebooks, this operation might take a few minutes and may even make the interface unresponsive.");
          let count = 0;
          let emptyNoteLinks = [];
          for await (const noteHandle of app.filterNotes({ group: "^vault" })) {
            count += 1;
            let noteContent;
            console.log(`Looking at note ${noteHandle.uuid}...`);
            try {
              noteContent = await app.getNoteContent(noteHandle);
              if (noteContent.trim() === "" || !noteContent.match(/[^\s\\]/mg)) {
                console.log(`Found empty note: ${count}`);
                emptyNoteLinks.push(`    * [${noteHandle.name || "[Untitled note]"}](https://www.amplenote.com/notes/${noteHandle.uuid})`);
                if (result)
                  await app.addNoteTag({ "uuid": noteHandle.uuid }, "-amplequery-to-be-deleted");
              }
            } catch (err) {
              console.log("Caught an error:", err);
              console.log("Error type:", err.constructor.name);
              if (err instanceof TypeError) {
                console.log("Ignoring Vault note because no password was provided by the user...");
                continue;
              }
            }
          }
          console.log("Writing list...");
          await app.context.replaceSelection("* Results:\n" + emptyNoteLinks.join("\n"));
          console.log("Success");
        } catch (err) {
          console.log(err);
          await app.alert(err);
        }
      },
      "Field": async function(app) {
        try {
          let notes = await app.filterNotes({ tag: app.settings["Tag to search in"] });
          let attributes = await this._getAllAttributesFromNoteHandles(app, notes);
          let field = await app.prompt(`Which field would you like to filter by?
 Options: ${Object.keys(attributes).join(", ")}`);
          let value = await app.prompt(`What value would you like to filter on?`);
          let result = [];
          for (const key in attributes[field]) {
            if (attributes[field][key] === value) {
              result.push(key);
            }
          }
          let noteUUID = await app.createNote("Query results");
          await app.insertContent({ uuid: noteUUID }, this._generateMDList(result));
        } catch (error) {
          app.alert(String(error));
        }
      },
      "Tag": async function(app) {
        try {
          let tagName = await app.prompt("What tag query to filter on?");
          let notes = await app.filterNotes({ tag: tagName });
          const self = this;
          let noteUUID = await app.createNote("Query results");
          let result = this._generateMDList(notes.map((obj) => self._createMDLinkFromNoteHandle(obj)));
          await app.insertContent(
            { uuid: noteUUID },
            result
          );
          await app.context.replaceSelection(result);
        } catch (error) {
          app.alert(String(error));
        }
      }
    },
    async _getAllAttributesFromNoteHandles(app, notes) {
      let attributes = {};
      for (let i = 0; i < notes.length; i++) {
        let note = notes[i];
        let contents = await app.getNoteContent({ uuid: note.uuid });
        const _attributes = this._getDictFromTable(contents);
        for (const key in _attributes) {
          if (!attributes[key]) {
            attributes[key] = {};
          }
          attributes[key][this._createMDLinkFromNoteHandle(note)] = _attributes[key];
        }
      }
      return attributes;
    },
    _createMDLinkFromNoteHandle(noteHandle) {
      return `[${noteHandle.name}](https://www.amplenote.com/notes/${noteHandle.uuid})`;
    },
    _generateMDList(input) {
      return input.map((item) => `- ${item}`).join("\n");
    },
    _getDictFromTable(input) {
      let result = {};
      const lines = input.split("\n");
      const table_lines = lines.filter((str) => str.startsWith("|"));
      for (let i = 2; i < table_lines.length; i++) {
        const [_, key, value, ...rest] = table_lines[i].split("|");
        result[key] = value;
      }
      return result;
    },
    _generateMarkdownTable(data) {
      const notes = Array.from(new Set(Object.values(data).flatMap(Object.keys)));
      const attributes = Object.keys(data);
      let table = "| " + ["Note", ...attributes].join(" | ") + " |\n";
      table += "| " + attributes.map((_) => "---").join(" | ") + " |\n";
      notes.forEach((note) => {
        let row = "| " + note + " ";
        attributes.forEach((attr) => {
          row += "| " + (data[attr][note] || "-") + " ";
        });
        row += "|\n";
        table += row;
      });
      return table;
    }
  };
  var plugin_default = plugin;
  return plugin;
})()
