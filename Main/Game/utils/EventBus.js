export class EventBus {
  constructor() {
    this.events = {};
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
  //Kênh phát sóng
  //emit(event, data): phát (publish) sự kiện; gọi lần lượt mọi callback đã đăng ký cho event với dữ liệu data.

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  //on(event, callback): đăng ký lắng nghe sự kiện; thêm callback vào mảng events[event].

  off(event, callback) {
    if (this.events[event]) {
      const index = this.events[event].indexOf(callback);
      if(index > -1) {
        this.events[event].splice(index, 1);
      }
    }
  }
  //off(event, callback): hủy đăng ký; gỡ callback khỏi mảng của event.
}

export const eventBus = new EventBus();