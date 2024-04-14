import { chmodSync, outputFileSync, removeSync } from "fs-extra";
import inquirer from "inquirer";
import { checkRpcFile } from "./checkRpcFile";
import { validateRpcUrl } from "./validateRpcUrl";

export const setRpc = (rpcPath: string) => {
  const cr = checkRpcFile(rpcPath);
  if (cr.type === "InvalidRpcUrl") removeSync(rpcPath);
  if (cr.type === "Success") return Promise.resolve();

  return inquirer.prompt([
    {
      type: "input",
      name: "rpcUrl",
      message: "Enter your rpc url:",
      validate: (input) => {
        const cr = validateRpcUrl(input);
        if (cr.type === "InvalidRpcUrl")
          return "Wrong rpc url, please retry again";

        outputFileSync(rpcPath, cr.result.toString());
        chmodSync(rpcPath, 0o600);
        return true;
      },
    },
  ]);
};
