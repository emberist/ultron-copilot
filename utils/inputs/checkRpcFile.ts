import { existsSync, readFileSync } from "fs-extra";
import { validateRpcUrl } from "./validateRpcUrl";

export const checkRpcFile = (rpcPath: string) => {
  if (!existsSync(rpcPath)) return { type: "RpcFileNotFound" as const };
  const rpcUrl = readFileSync(rpcPath).toString();
  return validateRpcUrl(rpcUrl);
};
