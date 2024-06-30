import { existsSync, readFileSync } from "fs-extra";
import { Profile } from "../../common/constants";
import { getRpcVariableName } from "../variables/getRpcVariableName";
import { getProfileRpcPath } from "./getProfileRpcPath";
import { validateRpcUrl } from "./validateRpcUrl";

export const checkRpcFile = (profile: Profile) => {
  const rpcFromEnv = process.env[getRpcVariableName(profile)];

  if (rpcFromEnv) {
    return {
      type: "Success" as const,
      result: rpcFromEnv,
    };
  }

  const rpcPath = getProfileRpcPath(profile);

  if (!existsSync(rpcPath)) {
    return { type: "RpcFileNotFound" as const };
  }

  const rpcUrl = readFileSync(rpcPath).toString();

  return validateRpcUrl(rpcUrl);
};
