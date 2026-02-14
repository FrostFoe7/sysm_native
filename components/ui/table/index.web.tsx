import React, { createContext, useMemo, useContext } from 'react';
import { StyleSheet } from 'react-native';
import {
  tableStyle,
  tableHeaderStyle,
  tableBodyStyle,
  tableFooterStyle,
  tableHeadStyle,
  tableRowStyleStyle,
  tableDataStyle,
  tableCaptionStyle,
} from './styles';

const TableHeaderContext = createContext<{
  isHeaderRow: boolean;
}>({
  isHeaderRow: false,
});
const TableFooterContext = createContext<{
  isFooterRow: boolean;
}>({
  isFooterRow: false,
});

const Table = React.forwardRef<HTMLTableElement, React.ComponentProps<'table'>>(
  function Table({ className, ...props }, ref) {
    return (
      <table
        ref={ref}
        className={tableStyle({ class: className })}
        {...props}
        style={props.style ? StyleSheet.flatten(props.style) : undefined}
      />
    );
  }
);

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentProps<'thead'>
>(function TableHeader({ className, ...props }, ref) {
  const contextValue = useMemo(() => {
    return {
      isHeaderRow: true,
    };
  }, []);
  return (
    <TableHeaderContext.Provider value={contextValue}>
      <thead
        ref={ref}
        className={tableHeaderStyle({ class: className })}
        {...props}
        style={props.style ? StyleSheet.flatten(props.style) : undefined}
      />
    </TableHeaderContext.Provider>
  );
});

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentProps<'tbody'>
>(function TableBody({ className, ...props }, ref) {
  return (
    <tbody
      ref={ref}
      className={tableBodyStyle({ class: className })}
      {...props}
      style={props.style ? StyleSheet.flatten(props.style) : undefined}
    />
  );
});

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentProps<'tfoot'>
>(function TableFooter({ className, ...props }, ref) {
  const contextValue = useMemo(() => {
    return {
      isFooterRow: true,
    };
  }, []);
  return (
    <TableFooterContext.Provider value={contextValue}>
      <tfoot
        ref={ref}
        className={tableFooterStyle({ class: className })}
        {...props}
        style={props.style ? StyleSheet.flatten(props.style) : undefined}
      />
    </TableFooterContext.Provider>
  );
});

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ComponentProps<'th'>
>(function TableHead({ className, ...props }, ref) {
  return (
    <th 
      ref={ref} 
      className={tableHeadStyle({ class: className })} 
      {...props} 
      style={props.style ? StyleSheet.flatten(props.style) : undefined}
    />
  );
});

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.ComponentProps<'tr'>
>(function TableRow({ className, ...props }, ref) {
  const { isHeaderRow } = useContext(TableHeaderContext);
  const { isFooterRow } = useContext(TableFooterContext);
  return (
    <tr
      ref={ref}
      className={tableRowStyleStyle({
        isHeaderRow,
        isFooterRow,
        class: className,
      })}
      {...props}
      style={props.style ? StyleSheet.flatten(props.style) : undefined}
    />
  );
});

const TableData = React.forwardRef<
  HTMLTableCellElement,
  React.ComponentProps<'td'>
>(function TableData({ className, ...props }, ref) {
  return (
    <td 
      ref={ref} 
      className={tableDataStyle({ class: className })} 
      {...props} 
      style={props.style ? StyleSheet.flatten(props.style) : undefined}
    />
  );
});

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.ComponentProps<'caption'>
>(function TableCaption({ className, ...props }, ref) {
  return (
    <caption
      ref={ref}
      className={tableCaptionStyle({ class: className })}
      {...props}
      style={props.style ? StyleSheet.flatten(props.style) : undefined}
    />
  );
});

Table.displayName = 'Table';
TableHeader.displayName = 'TableHeader';
TableBody.displayName = 'TableBody';
TableFooter.displayName = 'TableFooter';
TableHead.displayName = 'TableHead';
TableRow.displayName = 'TableRow';
TableData.displayName = 'TableData';
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableData,
  TableCaption,
};
