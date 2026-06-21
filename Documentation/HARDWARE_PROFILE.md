# Official Hardware Profile

Only this wiring profile is supported.

## Target

- Arduino Nano / ATmega328P
- 3 daisy-chained MAX7219 chips
- 24 seven-segment digits with decimal points
- Physical display: 8 columns x 3 rows
- Cell index: `y * 8 + x`

## Pins

| Function | Pin | Behavior |
| --- | --- | --- |
| MAX7219 CS/LOAD | D10 | Output |
| SPI MOSI | D11 | Hardware SPI |
| SPI SCK | D13 | Hardware SPI |
| Direction/menu pot | A4 | Analog input |
| BrightnessPot | A0 | Analog input, reserved |
| Confirm/forward | D5 | `INPUT_PULLUP`, pressed LOW |
| Reject/backward | D4 | `INPUT_PULLUP`, pressed LOW |
| Melody | D3 | Audio output |
| Bass | D9 | Audio output |

Audio volume is passive hardware and does not consume an Arduino input.

## Builder Wiring Checklist

Use this as the simple public wiring help for the beta.

- Arduino Nano GND is connected to the display/pot/button ground.
- MAX7219 VCC is connected to 5V.
- MAX7219 GND is connected to GND.
- MAX7219 DIN is connected to Nano D11.
- MAX7219 CLK is connected to Nano D13.
- MAX7219 CS/LOAD is connected to Nano D10.
- Three MAX7219 modules are daisy chained in the tested order.
- Direction/menu pot wiper is connected to A4.
- Direction/menu pot outer terminals are connected to 5V and GND.
- BrightnessPot wiper is connected to A0.
- BrightnessPot outer terminals are connected to 5V and GND.
- Confirm/forward button connects D5 to GND when pressed.
- Reject/backward button connects D4 to GND when pressed.
- No external resistors are needed for D5/D4 buttons because generated
  sketches use `INPUT_PULLUP`.
- Melody audio output is connected to D3.
- Bass audio output is connected to D9.
- Audio needs the same ground reference as the Arduino.
- The first silent audio test was caused by hardware wiring, so public wiring
  instructions must show D3/D9 clearly.

## MAX7219

- Use `SPI.h`.
- Send module 3, then module 2, then module 1.
- `MIRROR_DIGIT_X = true`.
- Bit 7 is decimal point.
- Bits 6..0 are segments A..G.
- Decode mode off.
- Scan all 8 digits.

## Brightness

- BrightnessPot wiper connects to A0.
- Pot outer terminals connect to GND and 5V.
- Low ADC reading means intensity 0; high means intensity 15.
- Read `analogRead(A0)` and map `0..1023` to MAX7219 intensity `0..15`.
- The MAX7219 has 16 intensity steps, numbered 0 through 15.
- Write intensity register `0x0A` to all three chips.
- Write only when the mapped step changes to avoid unnecessary SPI traffic.

Every future generated sketch that drives the display must include this
brightness behavior.

## Direction Pot

- ADC `< 184`: west
- ADC `< 358`: north-west
- ADC `< 552`: north
- ADC `< 736`: north-east
- Otherwise: east

## Buttons

- Software debounce: 40 ms.
- World movement hold-repeat starts after 500 ms.
- Hold-repeat interval: 200 ms.

## First Hardware Check

1. Export and upload a generated sketch.
2. Turn A0 and confirm display brightness changes.
3. Turn A4 and confirm facing/menu selection changes.
4. Press D5 and confirm it acts as forward/confirm.
5. Press D4 and confirm it acts as backward/reject.
6. If rows or columns look mirrored, do not add alternate wiring support in
   the app. First compare the physical MAX7219 chain order with this profile.

## Room Transitions

- Down: rows 2,1,0; segments D,G,A.
- Up: rows 0,1,2; segments A,G,D.
- Right: columns 7..0; BC then EF.
- Left: columns 0..7; EF then BC.

Do not change tested mapping through visual guesswork.
