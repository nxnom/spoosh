import { AlertIcon } from "./icons";

type InlineErrorProps = {
  message: string;
};

export function InlineError({ message }: InlineErrorProps) {
  return (
    <div className="inline-error" role="alert">
      <AlertIcon />
      <span>{message}</span>
    </div>
  );
}
