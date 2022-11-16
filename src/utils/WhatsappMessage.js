export default class WhatsappMessage {
  constructor(options) {
    this.type = null;
    this.template = {};
  }

  setType(type) {
    this.requestData.type = type;
    return this;
  }

  addComponent(type) {}
}
