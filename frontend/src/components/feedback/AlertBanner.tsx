type AlertBannerProps = {
  variant: "info" | "success" | "error";
  message: string;
};

export function AlertBanner({ variant, message }: AlertBannerProps) {
  return <div className={`alert-banner alert-${variant}`}>{message}</div>;
}
