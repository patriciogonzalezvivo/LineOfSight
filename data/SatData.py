# Author: Patricio Gonzalez Vivo - 2015 (@patriciogv)
import json
import os
import itertools
import requests

# Thanks to satNOGS for their great DB ( https://db.satnogs.org/api/ )
satNOGS_transmitters = requests.get('http://db.satnogs.org/api/transmitters/?format=json').json() # https://db.satnogs.org/api/transmitters/
satNOGS_modes = requests.get('https://db.satnogs.org/api/modes/?format=json').json() # https://db.satnogs.org/api/modes/

# get mode by id
def getMode(mode_id):
    for mode in satNOGS_modes:
        if mode['id'] == mode_id :
            return mode['name'] 
    return "---"

# Assing transmitters to satellites
def getTransmittersFor(sat):
    transmitters = []
    for item in satNOGS_transmitters:
        if item['norad_cat_id'] == sat['norad_id']:
            tran = {}
            for key, value in item.iteritems():
                if key == 'alive' and value == False:
                    return;
                elif key == 'invert' and value == False:
                    continue
                elif key == 'baud' and value == 0:
                    continue
                elif key == 'mode_id' and not (value is None):
                    tran['mode'] = getMode(value);
                elif not (value is None) and key != 'uuid' and key != 'norad_cat_id' and key != 'alive':
                    tran[key] = value;
            transmitters.append(tran)
    return transmitters

# Compute folder of satellites
def getDataFromLTEsFolder( folder ):
    data = {}
    types = []
    for filename in os.listdir(folder):
        if filename == '.DS_Store': 
            continue

        type = os.path.splitext(filename)[0]

        typeObj = {}
        if type == 'visible':
            typeObj['visible'] = True
        else:
            typeObj['visible'] = False

        typeObj['name'] = type
        typeObj['label'] = type
        types.append(typeObj)

        f = open(os.path.join(folder, filename), 'r')
        for name,lte1,lte2 in itertools.izip_longest(*[f]*3):
            sat = {}
            sat['name'] = name.rstrip()

            # Filter non operational
            if "[-]" in sat['name']: continue
            if "[P]" in sat['name']: continue
            if "[S]" in sat['name']: continue
            if "[B]" in sat['name']: continue

            # Add values
            sat['type'] = type
            sat['tleLine1'] = lte1.rstrip()
            sat['tleLine2'] = lte2.rstrip()
            sat['norad_id'] = int(sat['tleLine2'].split()[1]);
            # Add Transmitters using 
            sat['transmitters'] = getTransmittersFor(sat)

            # If it have state assing it
            sat['state'] = 'operational'
            if sat['name'].endswith(' [B]'):
                sat['state'] = "backup";
            elif sat['name'].endswith(' [S]'):
                sat['state'] = "spare";
            elif sat['name'].endswith(' [-]'):
                sat['state'] = "nonoperational";
            elif sat['name'].endswith(' [P]'):
                sat['state'] = "partially operational";
            elif sat['name'].endswith(' [X]'):
                sat['state'] = "extended mission";

            # Correct the name (taking out the state)
            if sat['name'].endswith(' [+]') or sat['name'].endswith(' [-]') or sat['name'].endswith(' [P]') or sat['name'].endswith(' [B]') or sat['name'].endswith(' [S]') or sat['name'].endswith(' [X]'):
                sat['name'] = sat['name'][:-4]

            # Avoid repetition
            if sat['norad_id'] in data:
                data[ sat['norad_id'] ]['type'] = sat['type'] + ', ' + data[ sat['norad_id'] ]['type']
            else: 
                data[ sat['norad_id'] ] = sat
        f.close()

    return data, types

# Compute folder of satellites
def getDataFromIDFolder(main_data, folder ):
    data = {}
    types = []
    for filename in os.listdir(folder):
        if filename == '.DS_Store': 
            continue

        type = os.path.splitext(filename)[0]

        typeObj = {}
        if type == 'visible':
            typeObj['visible'] = True
        else:
            typeObj['visible'] = False

        typeObj['name'] = type
        typeObj['label'] = type
        types.append(typeObj)

        with open(os.path.join(folder, filename), "r") as lines:
            for line in lines:
                norad_id = int(line.rstrip('\n').rstrip('\r'))
                if norad_id in main_data:
                    sat = main_data[norad_id]
                    data[ norad_id ] = sat
                        
    return data, types

def makeJsons(folder, data, types):
    # Construct JSON with types of sattelites
    with open(folder+'-types.json', 'w') as outfile:
        outfile.write(json.dumps(types, outfile, indent=4))
    print(str(len(data)) + ' satellites');
    outfile.close()

    # Construct JSON w satellites information
    final_data = []
    for satellite in data:
        final_data.append( data[satellite] )
    with open(folder+'-satellites.json', 'w') as outfile:
        outfile.write(json.dumps(final_data, outfile, indent=4))
    outfile.close()  