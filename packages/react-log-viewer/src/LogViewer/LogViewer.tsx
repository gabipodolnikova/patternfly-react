import React, { useState, useEffect, memo } from 'react';
import { LogViewerContext, LogViewerToolbarContext } from './LogViewerContext';
import { css } from '@patternfly/react-styles';
import { LogViewerRow } from './LogViewerRow';
import { DEFAULT_FOCUS, DEFAULT_SEARCH_INDEX, DEFAULT_INDEX } from './utils/constants';
import { searchForKeyword, parseConsoleOutput, escapeString } from './utils/utils';
import { VariableSizeList as List, areEqual } from '../react-window';
import styles from '@patternfly/react-styles/css/components/LogViewer/log-viewer';

interface LogViewerProps {
  /** String data being sent by the consumer*/
  data?: string;
  /** Consumer may turn off the visibility on the toolbar */
  hasToolbar?: boolean;
  /** Flag to enable or disable line numbers on the log viewer. */
  hasLineNumbers?: boolean;
  /** Width in pixels of the log viewer. */
  width?: number;
  /** Height in pixels of the log viewer. */
  height?: number;
  /** Rows rendered outside of view. The more rows are rendered, the higher impact on performance */
  overScanCount?: number;
  /** Toolbar rendered in the log viewer header */
  toolbar?: React.ReactNode;
  /** Content displayed while the log viewer is loading */
  loadingContent?: React.ReactNode;
  /** Flag indicating that log viewer is dark themed */
  theme?: 'dark' | 'light';
  /** Row index to scroll to */
  scrollToRow?: number;
  /** Number of rows to display in the log viewer */
  itemCount?: number;
  /** Component rendered in the log viewer console window header */
  header?: React.ReactNode;
  /** Component rendered in the log viewer console window footer */
  footer?: React.ReactNode;
  /** Callback function when scrolling the window.
   * scrollDirection is the direction of scroll, could be 'forward'|'backward'.
   * scrollOffset and scrollOffsetToBottom are the offset of the current position to the top or the bottom.
   * scrollUpdateWasRequested is false when the scroll event is cause by the user interaction in the browser, else it's true.
   * @example onScroll={({scrollDirection, scrollOffset, scrollOffsetToBottom, scrollUpdateWasRequested})=>{}}
   */
  onScroll?: ({
    scrollDirection,
    scrollOffset,
    scrollOffsetToBottom,
    scrollUpdateWasRequested
  }: {
    scrollDirection: 'forward' | 'backward';
    scrollOffset: number;
    scrollOffsetToBottom: number;
    scrollUpdateWasRequested: boolean;
  }) => void;
  /** Forwarded ref */
  innerRef?: React.RefObject<any>;
}

let canvas: HTMLCanvasElement | undefined;

const getCharNums = (windowWidth: number, font: string) => {
  // if given, use cached canvas for better performance
  // else, create new canvas
  canvas = canvas || document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = font;
  const oneChar = context.measureText('a');
  return Math.floor(windowWidth / oneChar.width);
};

const LogViewerBase: React.FunctionComponent<LogViewerProps> = memo(
  ({
    data = '',
    hasLineNumbers = true,
    height = 600,
    overScanCount = 10,
    loadingContent = '',
    toolbar,
    width,
    theme = 'light',
    scrollToRow = 0,
    itemCount = undefined,
    header,
    footer,
    onScroll,
    innerRef,
    ...props
  }: LogViewerProps) => {
    const [searchedInput, setSearchedInput] = useState<string | null>('');
    const [rowInFocus, setRowInFocus] = useState<number | null>(scrollToRow);
    const [searchedWordIndexes, setSearchedWordIndexes] = useState<number[] | null>([]);
    const [highlightedRowIndexes, setHighlightedRowIndexes] = useState<number[] | null>([]);
    const [currentSearchedItemCount, setCurrentSearchedItemCount] = useState<number>(0);
    const [parsedData, setParsedData] = useState<string[] | null>([]);
    const [lineHeight, setLineHeight] = useState<number>(0);
    const [charNumsPerLine, setCharNumsPerLine] = useState<number>(0);
    const [resizing, setResizing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [firstMount, setFirstMount] = useState(true);

    const logViewerRef = innerRef || React.createRef<any>();
    const containerRef = React.createRef<any>();
    let resizeTimer = null as any;

    useEffect(() => {
      if (containerRef && containerRef.current && loading) {
        window.addEventListener('resize', callbackResize);
        if (firstMount) {
          setLoading(false);
          setFirstMount(false);
        }
        const dummyIndex = document.createElement('span');
        dummyIndex.className = css(styles.logViewerIndex);
        const dummyText = document.createElement('span');
        dummyText.className = css(styles.logViewerText);
        containerRef.current.appendChild(dummyIndex);
        containerRef.current.appendChild(dummyText);
        const dummyIndexStyles = getComputedStyle(dummyIndex);
        const dummyTextStyles = getComputedStyle(dummyText);
        setLineHeight(parseFloat(dummyTextStyles.lineHeight));
        const lineWidth = hasLineNumbers
          ? (containerRef.current as HTMLDivElement).clientWidth -
            (parseFloat(dummyTextStyles.paddingLeft) +
              parseFloat(dummyTextStyles.paddingRight) +
              parseFloat(dummyIndexStyles.width))
          : (containerRef.current as HTMLDivElement).clientWidth -
            (parseFloat(dummyTextStyles.paddingLeft) + parseFloat(dummyTextStyles.paddingRight));
        const charNumsPerLine = getCharNums(
          lineWidth,
          `${dummyTextStyles.fontWeight} ${dummyTextStyles.fontSize} ${dummyTextStyles.fontFamily}`
        );
        setCharNumsPerLine(charNumsPerLine);
        containerRef.current.removeChild(dummyIndex);
        containerRef.current.removeChild(dummyText);
      }
      return () => window.removeEventListener('resize', callbackResize);
    }, [containerRef.current]);

    const callbackResize = () => {
      setResizing(true);
      setLoading(true);
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(() => {
        setResizing(false);
      }, 100);
    };

    useEffect(() => {
      if (!resizing) {
        setLoading(false);
      }
    }, [resizing]);

    const dataToRender = React.useMemo(
      () => ({
        parsedData,
        logViewerRef,
        rowInFocus,
        searchedWordIndexes,
        highlightedRowIndexes,
        setHighlightedRowIndexes
      }),
      [data, parsedData, logViewerRef, rowInFocus, searchedWordIndexes, highlightedRowIndexes, setHighlightedRowIndexes]
    );

    /* Parse data every time it changes */
    useEffect(() => {
      setParsedData(parseConsoleOutput(data));
    }, [data]);

    useEffect(() => {
      if (logViewerRef && logViewerRef.current) {
        logViewerRef.current.resetAfterIndex(0);
      }
    }, [parsedData]);

    useEffect(() => {
      if (scrollToRow && parsedData.length) {
        setRowInFocus(parsedData.length - 1);
        if (logViewerRef && logViewerRef.current) {
          logViewerRef.current.scrollToItem(scrollToRow, 'center');
        }
      }
    }, [parsedData, scrollToRow]);

    /* Updating searchedResults context state given changes in searched input */
    useEffect(() => {
      let foundKeywordIndexes: (number | null)[] = [];
      const adjustedSearchedInput = escapeString(searchedInput);

      if (adjustedSearchedInput !== '' && adjustedSearchedInput.length >= 3) {
        foundKeywordIndexes = searchForKeyword(adjustedSearchedInput, parsedData, itemCount || parsedData.length - 1);

        if (foundKeywordIndexes.length !== 0) {
          setSearchedWordIndexes(foundKeywordIndexes);
          scrollToRowInFocus(foundKeywordIndexes[DEFAULT_SEARCH_INDEX]);
          setCurrentSearchedItemCount(DEFAULT_INDEX);
        }
      }

      if (adjustedSearchedInput !== '' && adjustedSearchedInput.length < 3) {
        setRowInFocus(scrollToRow || DEFAULT_FOCUS);
        setCurrentSearchedItemCount(DEFAULT_INDEX);
        setSearchedWordIndexes([]);
      }

      if (adjustedSearchedInput === '') {
        setRowInFocus(scrollToRow || DEFAULT_FOCUS);
      }
    }, [searchedInput]);

    const scrollToRowInFocus = (searchedRowIndex: number) => {
      setRowInFocus(searchedRowIndex);
      logViewerRef.current.scrollToItem(searchedRowIndex, 'center');
    };

    const guessRowHeight = (rowIndex: number) => {
      const rowText = parsedData[rowIndex];
      // get the row numbers of the current text
      const numRows = Math.ceil(rowText.length / charNumsPerLine);
      // multiply by line height to get the total height
      return lineHeight * (numRows || 1);
    };

    const createList = (parsedData: string[]) => (
      <List
        className={css(styles.logViewerList)}
        height={height}
        width={width}
        itemSize={guessRowHeight}
        itemCount={typeof itemCount === 'undefined' ? parsedData.length : itemCount}
        itemData={dataToRender}
        ref={logViewerRef}
        overscanCount={overScanCount}
        onScroll={onScroll}
      >
        {LogViewerRow}
      </List>
    );

    return (
      <LogViewerContext.Provider
        value={{
          parsedData,
          searchedInput
        }}
      >
        <div
          className={css(
            styles.logViewer,
            hasLineNumbers && styles.modifiers.lineNumbers,
            theme === 'dark' && styles.modifiers.dark
          )}
          {...props}
        >
          {toolbar && (
            <LogViewerToolbarContext.Provider
              value={{
                searchedInput,
                rowInFocus,
                searchedWordIndexes,
                currentSearchedItemCount,
                scrollToRow: scrollToRowInFocus,
                setRowInFocus,
                setSearchedInput,
                setSearchedWordIndexes,
                setCurrentSearchedItemCount
              }}
            >
              <div className={css(styles.logViewerHeader)}>{toolbar}</div>
            </LogViewerToolbarContext.Provider>
          )}
          {header}
          <div className={css(styles.logViewerMain)} ref={containerRef}>
            {loading ? <div style={{ height }}>{loadingContent}</div> : createList(parsedData)}
          </div>
          {footer}
        </div>
      </LogViewerContext.Provider>
    );
  },
  areEqual
);

export const LogViewer = React.forwardRef((props: LogViewerProps, ref: React.Ref<any>) => (
  <LogViewerBase innerRef={ref as React.MutableRefObject<any>} {...props} />
));

LogViewer.displayName = 'LogViewer';
