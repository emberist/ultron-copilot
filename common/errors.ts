export class NoEnoughRepairKits extends Error {
  constructor() {
    super("NoEnoughRepairKits");
    this.name = "NoEnoughRepairKits";
  }
}

export class NoEnoughTokensToPerformLabsAction extends Error {
  constructor() {
    super("NoEnoughTokensToPerformLabsAction");
    this.name = "NoEnoughTokensToPerformLabsAction";
  }
}

export class BuildAndSignTransactionError extends Error {
  constructor() {
    super("BuildAndSignTransactionError");
    this.name = "BuildAndSignTransactionError";
  }
}

export class SendTransactionFailed extends Error {
  constructor() {
    super("SendTransactionFailed");
    this.name = "SendTransactionFailed";
  }
}
