# El test de la portada

Aquí se explica cómo funciona el test, de dónde salen los papeles de equipo y qué
reglas hay que respetar si escribís preguntas nuevas. Todo el contenido está en
`contenido.ts`, en este mismo directorio: se edita ese archivo, se guarda y la web
se actualiza sola.

## Qué hace

Seis preguntas, tres opciones cada una. Al terminar, el visitante ve dos cosas:

1. **En qué departamento encaja**, con el porcentaje de los tres.
2. **Qué papel suele hacer en un equipo**, con una frase corta.

Y un botón que le lleva a su departamento, que es para lo que existe todo esto.

## Cómo se calcula el departamento

Lo deciden **las cinco primeras preguntas**. Cada opción suma un punto a su
departamento y ya está: no hay pesos ni nada raro.

Como son cinco preguntas, **cada respuesta vale un 20% exacto** y los tres
porcentajes suman siempre 100 sin redondear.

**Puede haber empate.** Con cinco preguntas y tres departamentos sale un 2-2-1 con
facilidad. Cuando pasa, la página lo dice ("Encajas en dos") y ofrece los dos
botones, en vez de elegir por el visitante. Es a propósito: en un stand es mejor
que la persona decida a que la máquina se invente una preferencia que no existe.

Si algún día queréis que no haya empates posibles, la solución es una pregunta más
de departamento, no cambiar el cálculo. Aviso: con seis, la división deja de ser
redonda y los porcentajes salen 33/33/33 redondeados, que pueden sumar 99 o 101.
La página lo aguanta —redondea al pintar—, pero se ve.

Los números que sí salen limpios son 5, 10 y 20 preguntas. Con cinco ya se contesta
en menos de un minuto, que es lo que aguanta alguien de pie en un stand.

## Cómo se calcula el papel de equipo

Lo decide **solo la sexta pregunta**, que no puntúa departamento.

### Por qué va aparte

Es la parte menos obvia, así que conviene entenderla antes de tocar nada.

Lo lógico sería sacar el papel de las cinco preguntas que ya hay, sin añadir
ninguna. **No funciona.** Las cinco están escritas alrededor de los tres
departamentos, así que el estilo que transmite cada opción va pegado al
departamento del que habla. Al probarlo, a todo el que le salía Marketing le salía
el mismo papel, siempre. El resultado decía dos veces lo mismo con palabras
distintas.

Con una pregunta propia, las dos cosas se miden por separado y de verdad.

### De dónde salen los papeles

Del **test de roles de equipo de Belbin**, que se usa en gestión de equipos desde
los años 80. El original tiene siete apartados de ocho frases cada uno, donde
repartes diez puntos entre las frases que mejor te describen, y da **ocho roles**:

> Impulsor · Coordinador · Cerebro · Investigador de Recursos ·
> Monitor Evaluador · Implementador · Cohesionador · Finalizador

Aquí hay **tres**, y no es un recorte a ojo. Belbin agrupa sus ocho roles en tres
familias, y en el test va uno de cada una:

| Familia | Rol que la representa | Lo que aporta |
| --- | --- | --- |
| Mentales | **Cerebro** | Las ideas y las salidas que no se le ocurren a nadie |
| De acción | **Impulsor** | El empuje: arranca lo que está parado |
| Sociales | **Cohesionador** | Mantiene al grupo unido y sabe con quién contar |

Así las tres opciones cubren el mapa entero en lugar de un trozo. Y de paso la
pregunta tiene tres opciones, como las otras cinco.

Las tres frases de la sexta pregunta salen del **apartado VI del test original**
—el de trabajar con prisa y con gente desconocida, que es el que más distingue—
escritas en corto.

### Lo que esto no es

**No es un resultado de Belbin de verdad, y no hay que llamarlo así.** El test
original son 56 decisiones; este es una. Lo que da es un apunte, y por eso en
pantalla se dice "qué papel *sueles* hacer" y no "tu rol es".

La frase pequeña del final —"Papel de equipo según el test de Belbin"— cita la
fuente sin prometer un diagnóstico. En una escuela de ingeniería va a haber gente
que conozca el test: citarlo bien suma, exagerarlo resta.

## Reglas para escribir preguntas nuevas

Son tres y las tres importan. Saltárselas no rompe nada técnicamente: rompe el
test, que es peor, porque sigue funcionando y deja de medir.

### 1. Una opción nunca dice a qué departamento pertenece

Ni por su nombre ni por lo que nombra. En cuanto una opción menciona una web, un
cartel, las redes o un aula, el visitante ya sabe cuál es cuál y elige el
departamento que le sonaba bien de antes.

```
✗ "Del cartel y de contarlo en redes hasta llenar la sala."
✓ "Busco una comparación que le suene y tiro de ahí."
```

Las dos son Marketing. La primera lo grita; la segunda mide de verdad.

**La forma de conseguirlo:** planteas una escena neutra —explicarle algo a alguien,
entrar en un sitio nuevo, una tarde libre— y lo que cambia entre las tres opciones
es el reflejo, no el tema.

### 2. El orden va cambiado en cada pregunta

Si el departamento de Tech fuera siempre la opción A, a la tercera pregunta se
nota el patrón y el test deja de servir. Reparto actual:

| | A | B | C |
| --- | --- | --- | --- |
| 1 · Te toca explicarlo tú | Tech | Marketing | Eventos |
| 2 · Un sitio nuevo | Marketing | Eventos | Tech |
| 3 · Se está torciendo | Tech | Eventos | Marketing |
| 4 · Algo bueno que nadie ha visto | Marketing | Tech | Eventos |
| 5 · Te sobra una tarde | Eventos | Tech | Marketing |

Cada departamento sale **cinco veces**, una por pregunta, y ninguno cae siempre en
la misma letra.

### 3. Cada departamento aparece una vez por pregunta

Exactamente una. Si una pregunta tuviera dos opciones de Eventos y ninguna de
Tech, los porcentajes dejarían de sumar 100 y el marcador mentiría.

## Dónde se toca cada cosa

Todo en `contenido.ts`:

| Qué | Dónde |
| --- | --- |
| Las cinco preguntas de departamento | `test.preguntas` |
| La sexta, la del papel | `test.preguntaRol` |
| Las frases de los tres papeles | `test.roles` |
| El gancho y el texto de la portada | `test.gancho`, `test.descripcion` |
| Los textos de la pantalla de resultado | `test.resultado` |

Si añadís o quitáis preguntas, **la página se adapta sola**: el contador ("Pregunta
3 de 6"), la barra de progreso y los porcentajes se calculan a partir de cuántas
haya. No hay ningún número escrito a mano en el código.

Lo único que hay que acordarse de cambiar a mano es `test.descripcion`, que dice
"Seis preguntas" en texto.

## Probarlo antes de enseñarlo

Merece la pena hacer el test entero **tres veces**, contestando siempre lo mismo,
para ver que cada departamento sale cuando toca. Y una cuarta mezclando, para ver
el empate.

Se abre desde el botón de la portada y se cierra con Escape o con "Cerrar".
