import { removeSync } from "fs-extra";
import inquirer from "inquirer";
import { keypairPaths, resetOptions, rpcPaths } from "../../common/constants";

export const resetProfile = async () => {
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "resetProfile",
      message: "Choose an option:",
      choices: resetOptions,
    },
  ]);

  const resetOption = answer.resetProfile;
  switch (resetOption) {
    case "Reset Profile 1 - Keypair":
      removeSync(keypairPaths["Profile 1"]);
      console.log("Profile 1 keypair reset success. Please restart Ultron.");
      return true;
    case "Reset Profile 1 - RPC":
      removeSync(rpcPaths["Profile 1"]);
      console.log("Profile 1 RPC reset success. Please restart Ultron.");
      return true;
    case "Reset Profile 2 - Keypair":
      removeSync(keypairPaths["Profile 2"]);
      console.log("Profile 2 keypair reset success. Please restart Ultron.");
      return true;
    case "Reset Profile 2 - RPC":
      removeSync(rpcPaths["Profile 2"]);
      console.log("Profile 2 RPC reset success. Please restart Ultron.");
      return true;
    case "Reset Profile 3 - Keypair":
      removeSync(keypairPaths["Profile 3"]);
      console.log("Profile 3 keypair reset success. Please restart Ultron.");
      return true;
    case "Reset Profile 3 - RPC":
      removeSync(rpcPaths["Profile 3"]);
      console.log("Profile 3 RPC reset success. Please restart Ultron.");
      return true;
    default:
      return false;
  }
};
