import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface IJmlLiteProps {
  context: WebPartContext;
  isDarkTheme: boolean;
  hasTeamsContext: boolean;
}
