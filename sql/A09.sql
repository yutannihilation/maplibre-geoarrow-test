INSTALL spatial;
LOAD spatial;
INSTALL st_read_multi FROM community;
LOAD st_read_multi;
INSTALL arrow FROM community;
LOAD arrow;

CREATE TABLE t1 AS
SELECT
    area_cd::INTEGER as area_cd,
    layer_no::INTEGER as layer_no,
    prefec_cd::INTEGER as prefec_cd,
    ST_GeomFromWKB(geometry)::POLYGON_2D as geometry
FROM st_read_multi('data_raw/A09-18_13_GML/GeoJSON/*.geojson');

CALL register_geoarrow_extensions();

COPY t1 TO 'data/polygons.arrow';
