import { verifiedRpc } from "../../common/constants";

export const validateRpcUrl = (rpcUrl: string) => {
  try {
    const url = new URL(rpcUrl);

    if (verifiedRpc.includes(url.hostname) && url.protocol === "https:") {
      return { type: "Success" as const, result: rpcUrl };
    }

    return { type: "InvalidRpcUrl" as const };
  } catch (e) {
    return { type: "InvalidRpcUrl" as const };
  }
};
