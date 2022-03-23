# node-red-contrib-process-data-generator
Nodo de [Node-RED][1] para generar datos de proceso.


### Instalación
Puede instalar desde la paleta de Node-RED, o bien ejecutando el comando en el directorio de instalación de Node-RED.
```sh
npm install @msigrupo-develop/node-red-contrib-process-data-generator
```


### Dependencias
Este paquete depende de las siguientes librerías:
- [fast-csv][2]
- [node-opcua][3]
- [split2][4]


### Nodos
Puede ver [un ejemplo][14] de un flujo con todos los nodos.

##### Process Simulator
Inicia el proceso de simulación con tiempo real indicando cada cuánto tiempo se ejecuta, o bien con tiempo histórico haciendo una simulación de fechas.
Puede ver [un ejemplo][5].

##### File Signal
Lectura de fichero CSV indicando por cada señal que columna será el valor, o recogiendo las señales de la cabecera del fichero.
Puede ver [un ejemplo][6].

##### Source List Signal
Lectura de datos con paginación.
Puede ver [un ejemplo][7].

##### Random Signal
Devuelve una señal aleatoria dependiendo del peso de cada una de ellas. Cuanto mayor peso, mayor probabilidad.
Puede ver [un ejemplo][8].

##### Random Variation Signal
Incrementa y/o decrementa el valor de una señal iniciada en 0 dependiendo de los valores indicados en incremento y decremento. En caso de no poner máximo y/o mínimo, el valor puede llegar a ser infinito.
Puede ver [un ejemplo][9].

##### Math Calcs
Operación matemática (suma, resta, multiplicación o división) entre dos números.
Puede ver [un ejemplo][10].

##### Signal Noise
A partir de una señal ya definida, se aplica un ruído a la propia configurado en el nodo.
Puede ver [un ejemplo][11].

##### Trigger Signal
Al cambio de valor de una señal ya definida, muestra su valor.
Puede ver [un ejemplo][12].

##### OPC UA
Configuración de OPC UA con las señales definidas.
Puede ver [un ejemplo][13].




## Licencia
[MIT][15]

[1]:http://nodered.org
[2]:https://www.npmjs.com/package/fast-csv
[3]:https://www.npmjs.com/package/node-opcua
[4]:https://www.npmjs.com/package/split2
[5]:https://github.com/msigrupo/node-red-contrib-process-data-generator/blob/master/examples/ProcessSimulator.json
[6]:https://github.com/msigrupo/node-red-contrib-process-data-generator/blob/master/examples/FileSignal.json
[7]:https://github.com/msigrupo/node-red-contrib-process-data-generator/blob/master/examples/SourceListSignal.json
[8]:https://github.com/msigrupo/node-red-contrib-process-data-generator/blob/master/examples/RandomSignal.json
[9]:https://github.com/msigrupo/node-red-contrib-process-data-generator/blob/master/examples/RandomVariationSignal.json
[10]:https://github.com/msigrupo/node-red-contrib-process-data-generator/blob/master/examples/MathCalcs.json
[11]:https://github.com/msigrupo/node-red-contrib-process-data-generator/blob/master/examples/SignalNoise.json
[12]:https://github.com/msigrupo/node-red-contrib-process-data-generator/blob/master/examples/TriggerSignal.json
[13]:https://github.com/msigrupo/node-red-contrib-process-data-generator/blob/master/examples/OPCUA.json
[14]:https://github.com/msigrupo/node-red-contrib-process-data-generator/blob/master/examples/ProcessDataGenerator.json
[15]:https://github.com/msigrupo/node-red-contrib-process-data-generator/blob/master/LICENCE