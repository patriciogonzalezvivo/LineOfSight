#!/bin/bash
cd all
wget -q -N http://www.celestrak.com/NORAD/elements/amateur.txt
wget -q -N http://www.celestrak.com/NORAD/elements/argos.txt
wget -q -N http://www.celestrak.com/NORAD/elements/beidou.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/cubesat.txt
wget -q -N http://www.celestrak.com/NORAD/elements/dmc.txt
wget -q -N http://www.celestrak.com/NORAD/elements/education.txt
wget -q -N http://www.celestrak.com/NORAD/elements/engineering.txt
wget -q -N http://www.celestrak.com/NORAD/elements/galileo.txt
wget -q -N http://www.celestrak.com/NORAD/elements/geo.txt -O geostationary.txt
wget -q -N http://www.celestrak.com/NORAD/elements/geodetic.txt 
wget -q -N http://www.celestrak.com/NORAD/elements/glo-ops.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/supplemental/glonass.txt
wget -q -N http://www.celestrak.com/NORAD/elements/globalstar.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/goes.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/gorizont.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/supplemental/gps.txt
wget -q -N http://www.celestrak.com/NORAD/elements/gps-ops.txt
wget -q -N http://www.celestrak.com/NORAD/elements/intelsat.txt
wget -q -N http://www.celestrak.com/NORAD/elements/iridium.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/supplemental/meteosat.txt
wget -q -N http://www.celestrak.com/NORAD/elements/military.txt
wget -q -N http://www.celestrak.com/NORAD/elements/molniya.txt
wget -q -N http://www.celestrak.com/NORAD/elements/musson.txt
wget -q -N http://www.celestrak.com/NORAD/elements/nnss.txt
wget -q -N http://www.celestrak.com/NORAD/elements/noaa.txt
wget -q -N http://www.celestrak.com/NORAD/elements/orbcomm.txt
wget -q -N http://www.celestrak.com/NORAD/elements/other.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/other-comm.txt
wget -q -N http://www.celestrak.com/NORAD/elements/radar.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/raduga.txt
wget -q -N http://www.celestrak.com/NORAD/elements/resource.txt
wget -q -N http://www.celestrak.com/NORAD/elements/sarsat.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/sbas.txt
wget -q -N http://www.celestrak.com/NORAD/elements/science.txt
wget -q -N http://www.celestrak.com/NORAD/elements/stations.txt
wget -q -N http://www.celestrak.com/NORAD/elements/tdrss.txt
wget -q -N http://www.celestrak.com/NORAD/elements/tle-new.txt
wget -q -N http://www.celestrak.com/NORAD/elements/visual.txt -O visible.txt
wget -q -N http://www.celestrak.com/NORAD/elements/weather.txt
wget -q -N http://www.celestrak.com/NORAD/elements/x-comm.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/1999-025.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/cosmos-2251-debris.txt
# wget -q -N http://www.celestrak.com/NORAD/elements/2012-044.txt