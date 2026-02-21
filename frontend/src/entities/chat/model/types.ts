export type TaskMessageItem = {
  id: string;
  taskId: string;
  senderId: string;
  text: string;
  createdAt: string;
  sender: {
    id: string;
    username: string | null;
    displayName: string;
  };
};
