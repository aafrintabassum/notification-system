import React from "react";

function NotificationList({ buckets, newIds, activeFilter }) {
  const types = ["email", "sms", "push"];

  return (
    <div>
      {types.map((type) => {
        if (activeFilter && activeFilter !== type) return null;

        return (
          <div key={type}>
            <h2>{type.toUpperCase()}</h2>

            {buckets[type].map((item) => (
              <div
                key={item.id}
                style={{
                  background: newIds.has(item.id) ? "#d4ffd4" : "#f4f4f4",
                  margin: "5px",
                  padding: "8px",
                }}
              >
                <p>{item.message}</p>
                <small>{new Date(item.timestamp).toLocaleString()}</small>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default NotificationList;