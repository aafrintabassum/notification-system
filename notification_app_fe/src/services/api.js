export const getNotifications = async () => {
  return [
    {
      id: "1",
      type: "email",
      message: "Welcome Email",
      timestamp: new Date().toISOString(),
    },
    {
      id: "2",
      type: "sms",
      message: "OTP Message",
      timestamp: new Date().toISOString(),
    },
    {
      id: "3",
      type: "push",
      message: "App Notification",
      timestamp: new Date().toISOString(),
    },
  ];
};

export const postNotification = async (payload) => {
  return {
    id: Date.now().toString(),
    ...payload,
    timestamp: new Date().toISOString(),
  };
};