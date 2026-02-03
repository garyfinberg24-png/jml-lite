import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle,
  PropertyPaneDropdown
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import { initializeIcons } from '@fluentui/react/lib/Icons';
import JmlLite from './components/JmlLite';
import { IJmlLiteProps } from './components/IJmlLiteProps';
import { injectSharePointOverrides } from '../../utils/SharePointOverrides';

export interface IJmlLiteWebPartProps {
  description: string;
  title: string;
  defaultTab: string;
  showSummaryCards: boolean;
}

export default class JmlLiteWebPart extends BaseClientSideWebPart<IJmlLiteWebPartProps> {

  private _isDarkTheme: boolean = false;

  public render(): void {
    const element: React.ReactElement<IJmlLiteProps> = React.createElement(
      JmlLite,
      {
        context: this.context,
        isDarkTheme: this._isDarkTheme,
        hasTeamsContext: !!this.context.sdks.microsoftTeams
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onInit(): Promise<void> {
    initializeIcons(undefined, { disableWarnings: true });
    injectSharePointOverrides();
    return Promise.resolve();
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) return;
    this._isDarkTheme = !!currentTheme.isInverted;
    const { semanticColors } = currentTheme;
    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [{
        header: { description: 'Configure JML Lite settings' },
        groups: [{
          groupName: 'General Settings',
          groupFields: [
            PropertyPaneTextField('title', {
              label: 'Dashboard Title',
              placeholder: 'JML Lite'
            }),
            PropertyPaneTextField('description', {
              label: 'Description',
              multiline: true,
              rows: 3
            }),
            PropertyPaneDropdown('defaultTab', {
              label: 'Default Tab',
              options: [
                { key: 'dashboard', text: 'Dashboard' },
                { key: 'onboarding', text: 'Onboarding' },
                { key: 'myonboarding', text: 'My Onboarding' },
                { key: 'mover', text: 'Transfers' },
                { key: 'offboarding', text: 'Offboarding' },
                { key: 'jmlreporting', text: 'Reporting' }
              ],
              selectedKey: this.properties.defaultTab || 'dashboard'
            }),
            PropertyPaneToggle('showSummaryCards', {
              label: 'Show Summary Cards',
              onText: 'Visible',
              offText: 'Hidden',
              checked: this.properties.showSummaryCards !== false
            })
          ]
        }]
      }]
    };
  }
}
