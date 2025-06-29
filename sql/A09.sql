INSTALL spatial;
LOAD spatial;
INSTALL st_read_multi FROM community;
LOAD st_read_multi;
INSTALL arrow FROM community;
LOAD arrow;

CALL register_geoarrow_extensions();

CREATE TABLE t_A09 AS
SELECT
    area_cd::INTEGER as area_cd,
    layer_no::INTEGER as layer_no,
    prefec_cd::INTEGER as prefec_cd,
    ST_GeomFromWKB(geometry)::POLYGON_2D as geometry
FROM st_read_multi('data_raw/A09-18_13_GML/GeoJSON/*.geojson');

COPY t_A09 TO 'public/data/A09.arrow';

CREATE TABLE t_simple_data AS
SELECT ST_GeomFromText(geom)::POLYGON_2D as geometry
FROM (VALUES
    ('POLYGON (( 139.297 36.0797, 139.499 35.5917, 140.118 35.5082, 140.368 36.0438, 139.742 36.4465, 139.297 36.0797 ))'),
    ('POLYGON (( 139.885 36.9587, 139.653 36.5535, 140.333 36.5400, 139.885 36.9587 ))')
) AS t(geom);

COPY t_simple_data TO 'public/data/simple_data.arrow';

