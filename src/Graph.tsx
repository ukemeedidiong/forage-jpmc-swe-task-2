import React, { Component } from 'react';
import { Table } from '@finos/perspective';
import { ServerRespond } from './DataStreamer';
import './Graph.css';

/**
 * Props declaration for <Graph />
 */
interface IProps {
  data: ServerRespond[],
}

/**
 * Perspective library adds load to HTMLElement prototype.
 * This interface acts as a wrapper for Typescript compiler.
 */
interface PerspectiveViewerElement extends HTMLElement {
  load: (table: Table) => void,
}

/**
 * React component that renders Perspective based on data
 * parsed from its parent through data property.
 */
class Graph extends Component<IProps, {}> {
  // Perspective table
  table: Table | undefined;
  lastTimestamp: Date | undefined;

  render() {
    return React.createElement('perspective-viewer');
  }

  componentDidMount() {
    // Get element to attach the table from the DOM.
    const elem: PerspectiveViewerElement = document.getElementsByTagName('perspective-viewer')[0] as unknown as PerspectiveViewerElement;

    const schema = {
      stock: 'string',
      top_ask_price: 'float',
      top_bid_price: 'float',
      timestamp: 'date',
    };

    if (window.perspective && window.perspective.worker()) {
      this.table = window.perspective.worker().table(schema);
    }

    if (this.table) {
      // Load the `table` in the `<perspective-viewer>` DOM reference.
      elem.load(this.table);

      // Add more Perspective configurations here.
      elem.setAttribute('view', 'y_line'); // Set view to a line graph
      elem.setAttribute('row-pivots', '["timestamp"]'); // Use timestamp as the x-axis
      elem.setAttribute('columns', '["top_ask_price"]'); // Set top_ask_price as y-axis
      elem.setAttribute('aggregates', JSON.stringify({
        stock: 'distinct count',
        top_ask_price: 'avg',
        top_bid_price: 'avg',
        timestamp: 'distinct count',
      }));
    }
  }

  componentDidUpdate() {
    if (this.table) {
      // Filter out duplicate data based on timestamp
      const newData = this.props.data.filter((el: ServerRespond) => {
        const timestamp = new Date(el.timestamp);
        if (!this.lastTimestamp || timestamp > this.lastTimestamp) {
          this.lastTimestamp = timestamp;
          return true;
        }
        return false;
      });

      // Convert data to the format expected by Perspective
      const formattedData = newData.map((el: ServerRespond) => ({
        stock: el.stock,
        top_ask_price: el.top_ask && el.top_ask.price !== undefined ? el.top_ask.price : 0,
        top_bid_price: el.top_bid && el.top_bid.price !== undefined ? el.top_bid.price : 0,
        timestamp: new Date(el.timestamp),
      }));

      // Create a new object where each key points to an array of values
      const dataObject: Record<string, (string | number | boolean | Date)[]> = {
        stock: [],
        top_ask_price: [],
        top_bid_price: [],
        timestamp: [],
      };

      formattedData.forEach(row => {
        Object.keys(dataObject).forEach(key => {
          // Use type assertion to avoid TypeScript errors
          dataObject[key].push(row[key as keyof typeof row] as any);
        });
      });

      // Update the table with the new data
      this.table.update(dataObject);
    }
  }
}

export default Graph;
