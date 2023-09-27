import { Todo } from "@/services/todo/todo";

export function MiniTodo({ todo }: { todo: Todo }) {
  return <div>{todo.title}</div>;
}
