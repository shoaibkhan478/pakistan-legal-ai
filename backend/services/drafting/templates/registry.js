/**
 * TEMPLATE REGISTRY
 * -----------------
 * Add a new document type by dropping a new file in templates/ with the
 * same shape ({ schema, render }) and registering it here. Nothing else
 * in the backend needs to change.
 */
module.exports = {
  bail_application: require("./bailApplication"),
  plaint: require("./plaint"),
  legal_notice: require("./legalNotice"),
  legal_notice_reply: require("./legalNoticeReply"),
  affidavit: require("./affidavit"),
  petition: require("./petition"),
  appeal: require("./appeal"),
  contract: require("./contract"),
};
