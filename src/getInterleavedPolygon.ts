// For some reason, these functions are not available on @geoarrow/deck.gl-layers
//
// So, copied from https://github.com/geoarrow/deck.gl-layers/blob/343eacfffb66ff631d93d7fac99fc8a7d1f868c8/src/utils/utils.ts

import * as geoarrow from "@geoarrow/geoarrow-js";
import * as arrow from "apache-arrow";

export function convertStructToFixedSizeList(
  coords: arrow.Data<arrow.Struct<{ x: arrow.Float64; y: arrow.Float64 }>>
): arrow.Data<arrow.FixedSizeList<arrow.Float64>> {
  const nDim = coords.children.length;
  const interleavedCoords = new Float64Array(coords.length * nDim);

  for (let i = 0; i < coords.length; i++) {
    for (let j = 0; j < nDim; j++) {
      interleavedCoords[i * nDim + j] = coords.children[j].values[i];
    }
  }

  const childDataType = new arrow.Float64();
  const dataType = new arrow.FixedSizeList(
    nDim,
    new arrow.Field("coords", childDataType)
  );

  const interleavedCoordsData = arrow.makeData({
    type: childDataType,
    length: interleavedCoords.length,
    data: interleavedCoords,
  });

  const data = arrow.makeData({
    type: dataType,
    length: coords.length,
    nullCount: coords.nullCount,
    nullBitmap: coords.nullBitmap,
    child: interleavedCoordsData,
  });

  return data;
}

export function getInterleavedLineString(
  lineStringData: geoarrow.data.LineStringData
): geoarrow.data.LineStringData {
  const points = geoarrow.child.getLineStringChild(lineStringData);
  // const coords = getPointChild(points);
  const interleavedPoints = convertStructToFixedSizeList(points);

  return arrow.makeData({
    type: new arrow.List(new arrow.Field("element", interleavedPoints.type)),
    length: lineStringData.length,
    nullCount: lineStringData.nullCount,
    nullBitmap: lineStringData.nullBitmap,
    valueOffsets: lineStringData.valueOffsets,
    offset: lineStringData.offset,
    child: interleavedPoints,
  });
}

export function getInterleavedPolygon(
  polygonData: geoarrow.data.PolygonData
): geoarrow.data.PolygonData {
  const lineString = geoarrow.child.getPolygonChild(polygonData);
  const interleavedLineString = getInterleavedLineString(lineString);

  return arrow.makeData({
    type: new arrow.List(
      new arrow.Field("element", interleavedLineString.type)
    ),
    length: polygonData.length,
    nullCount: polygonData.nullCount,
    nullBitmap: polygonData.nullBitmap,
    valueOffsets: polygonData.valueOffsets,
    offset: polygonData.offset,
    child: interleavedLineString,
  });
}
