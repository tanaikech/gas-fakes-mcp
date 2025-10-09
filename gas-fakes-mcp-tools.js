import { z } from "zod";

const __sandbox = {
  /**
   * Header for sandbox of gas-fakes
   */
  head: function (object) {
    const {
      gas_fakes_args: { sandbox = true, whitelistItems = [] },
    } = object;
    const behavior = ScriptApp.__behavior;
    if (whitelistItems.length === 0) {
      if (sandbox) {
        behavior.sandBoxMode = true;
      }
    } else {
      behavior.sandboxMode = true;
      behavior.strictSandbox = true;
      const items = whitelistItems.map((id) =>
        behavior.newIdWhitelistItem(id).setWrite(true)
      );
      behavior.setIdWhitelist(items);
    }
    return behavior;
  },

  /**
   * Footer for sandbox of gas-fakes
   */
  foot: function (object) {
    const {
      behavior,
      gas_fakes_args: { sandbox = true, whitelistItems = [] },
    } = object;
    if (whitelistItems.length === 0) {
      if (sandbox) {
        behavior.trash();
      }
    } else {
      behavior.trash();
    }
  },
};

const tools_obj = [
  {
    /**
     * Name of this tool
     */
    name: "sample_tool_1",
    /**
     * JSON schema for giving arguments
     */
    schema: {
      description: "Use this to search files by a filename on Google Drive.",
      inputSchema: {
        /**
         * This object is used for using a sandbox of gas-fakes
         */
        gas_fakes_args: z
          .object({
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
          })
          .describe(),
        /**
         * This object is used for providing arguments to the Google Apps Script.
         */
        gas_args: z
          .object({
            filename: z.string().describe("Filename of the search file."),
          })
          .describe(),
      },
    },
    /**
     * Function for processing a task of this tool
     * Please include "__sandbox.head" and "__sandbox.foot".
     */
    func: async (object = {}) => {
      /**
       * This is required to be included for using gas-fakes.
       */
      await import("@mcpher/gas-fakes/main.js");

      /**
       * Header for sandbox of gas-fakes
       * This is required to be set.
       */
      const behavior = __sandbox.head(object);
      const {
        gas_args: { filename },
      } = object;
      /**
       * Google Apps Script
       * Directly put the generated Google Apps Script here as follows.
       */
      const files = DriveApp.getFilesByName(filename);
      const ar = [];
      while (files.hasNext()) {
        const file = files.next();
        ar.push({ filename: file.getName(), fileId: file.getId() });
      }
      /**
       * Footer for sandbox of gas-fakes
       * This is required to be set.
       */
      __sandbox.foot({ ...object, behavior });

      /**
       * The value of a property "content[0].text" is required to be a string value.
       */
      return { content: [{ type: "text", text: JSON.stringify(ar) }] };
    },
  },
];

export const tools = [...tools_obj];
