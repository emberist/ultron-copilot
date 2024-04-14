import { removeSync } from "fs-extra";
import inquirer from "inquirer";
import { checkKeypairFile } from "./checkKeypairFile";

export const setUsageDisclaimer = (keypairPath: string) => {
  const ckf = checkKeypairFile(keypairPath);
  if (ckf.type === "KeypairFileParsingError") removeSync(keypairPath);
  if (ckf.type === "Success") return Promise.resolve();

  console.log(
    "Use of this tool is entirely at your own risk. A private key is required for the tool to function properly. The creator of this tool assumes no responsibility for any misuse or any consequences that arise from its use."
  );
  return inquirer.prompt([
    {
      type: "confirm",
      name: "usageDisclaimer",
      message:
        "Do you understand and accept the risks associated with using this tool, as outlined in the warning above?",
    },
  ]);
};
