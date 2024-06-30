import { chmodSync, outputFileSync, removeSync } from "fs-extra";
import inquirer from "inquirer";
import { Profile } from "../../common/constants";
import { getRpcVariableName } from "../variables/getRpcVariableName";
import { checkRpcFile } from "./checkRpcFile";
import { getProfileRpcPath } from "./getProfileRpcPath";
import { validateRpcUrl } from "./validateRpcUrl";

export const setRpc = (profile: Profile) => {
  if (process.env[getRpcVariableName(profile)]) {
    return Promise.resolve();
  }

  const rpcPath = getProfileRpcPath(profile);
  const cr = checkRpcFile(profile);

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
