import { Err, Ok } from "@/utils/result";
import { CalendarEvent, EventNotification } from "../events/events";

export class NotificationManager {
  private notifications: Map<EventNotification["id"], NodeJS.Timeout>;
  constructor() {
    this.notifications = new Map();
    if (Notification == null || !("Notification" in window)) {
      console.log("This browser does not support notifications.");
    } else if (Notification.permission !== "granted") {
      Notification.requestPermission((permission) => {
        if (permission === "granted") {
          console.log("Permission granted");
        }
      });
    }
  }

  push(notification: EventNotification, event: CalendarEvent) {
    if (
      !this.notifications.has(notification.id) &&
      Notification?.permission === "granted"
    ) {
      if (Date.now() >= event.endDate) {
        return Err(Symbol("Event already concluded"));
      }
      const reference =
        notification.from === "start" ? event.startDate : event.endDate;
      const timeOffset =
        notification.time *
        (notification.timescale === "hours"
          ? 60 * 60 * 1000
          : notification.timescale === "minutes"
          ? 60 * 1000
          : 0);
      const notificationTime = reference - timeOffset;
      if (notificationTime <= Date.now()) {
        return Err(Symbol("Notification already sent"));
      }

      const timeout = setTimeout(() => {
        new Notification(
          `${notification.time} ${notification.timescale} from the ${notification.from} of ${event.title} `,
        );
      }, notificationTime - Date.now());

      this.notifications.set(notification.id, timeout);
      return Ok(notification);
    }

    return Err(Symbol("Notification was already registered"));
  }

  remove(notificationId: EventNotification["id"]) {
    const notificationRegistered = this.notifications.get(notificationId);
    if (notificationRegistered) {
      clearTimeout(notificationRegistered);
      this.notifications.delete(notificationId);
      return Ok(notificationRegistered);
    }

    return Err(Symbol("Couldn't find any notification with this id"));
  }

  removeAll() {
    this.notifications.clear();
  }
}

export type { EventNotification };
