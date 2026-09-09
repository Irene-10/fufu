type FufuWindow = Window & { fufu?: Window["fufu"] };

export function fufuApi(): Window["fufu"] | undefined {
  return (window as FufuWindow).fufu;
}
