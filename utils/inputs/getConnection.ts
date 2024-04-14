import { Connection } from "@solana/web3.js";
import { Profile } from "../../common/constants";
import { checkRpcFile } from "./checkRpcFile";
import { getProfileRpcPath } from "./getProfileRpcPath";

export const getConnection = (profile: Profile) => {
  const rpcPath = getProfileRpcPath(profile);

  try {
    const cr = checkRpcFile(rpcPath);
    if (cr.type === "InvalidRpcUrl") return cr;
    if (cr.type === "RpcFileNotFound") return cr;

    const connection = new Connection(cr.result.toString(), "confirmed");
    return { type: "Success" as const, data: connection };
  } catch (e) {
    return { type: "GetConnectionError" as const };
  }
};
