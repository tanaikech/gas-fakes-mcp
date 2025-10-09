import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from "child_process";
import fs from "fs/promises";
import { setTimeout } from "node:timers/promises";
import { promisify } from "util";
import { z } from "zod";
import { tools } from "./gas-fakes-mcp-tools.js";

const server = new McpServer({
  name: "MCP server for gas-fakes",
  version: "0.0.2",
});

const execAsync = promisify(exec);

const base_tools = [
  {
    name: "run_gas_with_gas-fakes",
    schema: {
      description: [
        `Use this for the following situations.`,
        `- You are required to safely execute a script of Google Apps Script in a sandbox using gas-fakes.`,
        `- You are required to process tasks that cannot be achieved with other tools, and you can generate a Google Apps Script to achieve the tasks, and safely execute it in a sandbox using gas-fakes.`,
        `- You are required to process tasks that cannot be achieved with other tools, and a Google Apps Script to achieve the tasks is provided from a prompt or other tools, and safely execute it in a sandbox using gas-fakes.`,
      ].join("\n"),
      inputSchema: {
        gas_script: z
          .string()
          .describe(
            `Provide a Google Apps Script. The Google Apps Script is the generated script or the script provided by a prompt. When you put the script in a function like \`function sample() { script }\`, it is required to add \`sample();\` to run the function. When you directly put the script, the script can be run. If an error occurs, modify the script by referring to StackOverflow again.`
          ),
        whitelistItems: z
          .array(z.string().describe(`File ID of file on Google Drive`))
          .describe(
            `Use this to access the existing files on Google Drive. Provide the file IDs of the files on Google Drive as an array. When this is used, the property "sandbox" is required to be true. The default is no items in an array.`
          )
          .optional(),
        sandbox: z
          .boolean()
          .describe(
            `The default is true. When this is true, the script is run with the sandbox. When this is false, the script is run without the sandbox.`
          ),
      },
    },
    func: async (object = {}) => {
      const { sandbox = true, whitelistItems = [], gas_script } = object;
      const importFile = "./sample_gas.mjs";

      function getImportScript() {
        const importScriptAr = [`import "@mcpher/gas-fakes/main.js"`, ""];
        if (whitelistItems.length === 0) {
          importScriptAr.push(
            sandbox ? `ScriptApp.__behavior.sandBoxMode = true;` : "",
            `\n\n${gas_script}\n\n`,
            sandbox ? `ScriptApp.__behavior.trash();` : ""
          );
        } else {
          const wl = whitelistItems
            .map((id) => `behavior.newIdWhitelistItem("${id}").setWrite(true)`)
            .join(",");
          importScriptAr.push(
            `const behavior = ScriptApp.__behavior;`,
            `behavior.sandboxMode = true;`,
            `behavior.strictSandbox = true;`,
            `behavior.setIdWhitelist([${wl}]);`,
            `\n\n${gas_script}\n\n`,
            `ScriptApp.__behavior.trash();`
          );
        }
        return importScriptAr.join("\n");
      }

      try {
        const importScript = getImportScript();
        await fs.writeFile(importFile, importScript);
        await setTimeout(500);

        const { stdout } = await execAsync(`node ./${importFile}`);
        return {
          content: [{ type: "text", text: stdout || "Done." }],
          isError: false,
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: err.message }],
          isError: true,
        };
      } finally {
        try {
          await fs.unlink(importFile);
        } catch (err) {
          return {
            content: [{ type: "text", text: err.message }],
            isError: true,
          };
        }
      }
    },
  },
  {
    name: "explanation_add_gas_to_mcp",
    schema: {
      description: `Use this to know how to register a Google Apps Script as a tool of the MCP server ("MCP server for gas-fakes").`,
      inputSchema: {},
    },
    func: async (object = {}) => {
      const text = [
        `The steps for registering a Google Apps Script as a tool of the MCP server are as follows.`,
        `1. Generate a Google Apps Script. When you have already done it, you can use it.`,
        `2. Understand a tool "sample_tool_1" in an array "tools_obj" of a script file "@gas-fakes-mcp-tools.js".`,
        `3. By following the rule of the tool "sample_tool_1", create an object for adding to an array "tools_obj" by inserting the generated Google Apps Script.`,
        `4. Add the object to an array "tools_obj".`,
        ``,
        `## Important`,
        `- The generated Google Apps Script is not required to be included in a variable as a string. You can directly put it in "func" of the tool.`,
        `- The end of each line continuing to the next line is not required to use "\\".`,
        `- Please include "__sandbox.head" and "__sandbox.foot".`,
        `- The characters " and ' in the script are not required to be escaped except for being in the text and the template literal.`,
        `- A property "gas_fakes_args" is required to always be included.`,
        `- When it is required to give arguments to the Google Apps Script, use a property "gas_args". When it is not required to use arguments, it is not required to use the property "gas_args".`,
        `- In this case, the MCP server with a new tool will be manually loaded with a refresh command by a user after you have added it.`,
        `- If it is required to remove a tool from this MCP server, remove the tool from a script file "@gas-fakes-mcp-tools.js". **Under no circumstances should you remove tools from the file "gas-fakes-mcp.js".**`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    },
  },
];

const tool_ar = [...base_tools, ...tools];
for (let { name, schema, func } of tool_ar) {
  server.registerTool(name, schema, func);
}

const transport = new StdioServerTransport();
await server.connect(transport);
