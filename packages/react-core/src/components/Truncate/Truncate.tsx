import * as React from 'react';

export enum TruncatePosition {
  start = 'start',
  end = 'end',
  middle = 'middle'
}

export interface TruncateProps {
  /** Class to add to outer div */
  className?: string;
  /** Text that you want to truncate */
  content: string;
  /** Where you want to truncate the text */
  position: TruncatePosition;
  /** Tooltip position */
  tooltipPosition?: string;
}

function getTextWidth(text: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  context.font = getComputedStyle(document.body).font;

  return context.measureText(text).width;
}

const getSubstringLenth = (maxLength: number, textWidth: number, content: string) =>
  (maxLength / textWidth) * content.length;

const getTruncated = (content: string, position: TruncatePosition, maxLength: number) => {
  // console.log(content);
  // console.log(position);
  // console.log(maxLength);
  const textWidth = getTextWidth(content);
  // console.log(textWidth);
  if (textWidth > maxLength) {
    if (TruncatePosition.end === position) {
      return content.substring(0, getSubstringLenth(maxLength, textWidth, content) - 3).trim() + '...';
    }
    if (TruncatePosition.start === position) {
      return '...' + content.substring(getSubstringLenth(maxLength, textWidth, content) - 3, content.length).trim();
    }
    if (TruncatePosition.middle === position) {
      // still not it
      return (
        content.substring(0, ((maxLength / textWidth) * content.length) / 2 - 3).trim() +
        '...' +
        content.substring(getSubstringLenth(maxLength, textWidth, content), content.length).trim()
      );
    }
  }
  return content;
};

export const Truncate: React.FunctionComponent<TruncateProps> = ({
  // className,
  position = TruncatePosition.end,
  content
}: // tooltipPosition = 'auto'
TruncateProps) => {
  const [width, setWidth] = React.useState(null);
  // const divRef = React.useRef<HTMLDivElement>();
  // const size = divRef.current.offsetWidth;
  const div = React.useCallback(node => {
    if (node !== null) {
      setWidth(node.getBoundingClientRect().width);
    }
  }, []);
  return <div ref={div}>{getTruncated(content, position, width)}</div>;
};

Truncate.displayName = 'Truncate';
