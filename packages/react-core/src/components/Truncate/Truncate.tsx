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
  Math.ceil((maxLength / textWidth) * content.length);

const getTruncated = (content: string, position: TruncatePosition, maxLength: number) => {
  // console.log(content);
  // console.log(position);
  // console.log(maxLength);
  const textWidth = getTextWidth(content);
  // console.log(textWidth);
  if (textWidth > maxLength && maxLength) {
    if (TruncatePosition.end === position) {
      return content.substring(0, getSubstringLenth(maxLength, textWidth, content) - 3).trim() + '...';
    }
    if (TruncatePosition.start === position) {
      return '...' + content.substring(getSubstringLenth(maxLength, textWidth, content) - 3, content.length).trim();
    }
    if (TruncatePosition.middle === position) {
      // const firstHalfOfContent = content.substring(0, content.length/2);
      // const secondHalfOfContent = content.substring(content.length/2 + 1, content.length);
      // return (
      //   firstHalfOfContent.substring(0, Math.round(((maxLength/2) / getTextWidth(firstHalfOfContent)) * firstHalfOfContent.length) - 3).trim() +
      //   '...' +
      //   secondHalfOfContent.substring(Math.round(((maxLength/2) / getTextWidth(secondHalfOfContent)) * secondHalfOfContent.length), secondHalfOfContent.length).trim()
      // );
      return (
        content.substring(0, Math.round((maxLength / getTextWidth(content)) * content.length) / 2 - 3).trim() +
        '...' +
        content.substring(Math.round((maxLength / getTextWidth(content)) * content.length) / 2, content.length).trim()
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
  const spanRef = React.useRef<HTMLSpanElement | undefined>();
  React.useEffect(() => {
    if (spanRef.current) {
      setWidth(spanRef.current.getBoundingClientRect().width);
      window.addEventListener('resize', () => {
        setWidth(spanRef.current.getBoundingClientRect().width);
      });
      // clean up
      // return () => spanRef.current.removeEventListener()
    }
  }, [spanRef.current]);
  // const span = React.useCallback(node => {
  //   if (node !== null) {
  //     setWidth(node.getBoundingClientRect().width);
  //   }
  // }, []);
  return <span ref={spanRef}>{getTruncated(content, position, width)}</span>;
};

Truncate.displayName = 'Truncate';
