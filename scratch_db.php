<?php
require 'api/utils/Env.php';
require 'api/config/Database.php';

$csvData = <<<EOD
COD;DESCRIPCION;% COMESTIBLE;kcal x 100 g o 100ml;Proteinas g;Grasa g;carbohidratos g;calcio ;hierro;sodio
A010;Arroz;100%;353;6.7;0.4;80.1;9;0.8;2
A012;Avena en hojuelas;100%;411;16.9;7.5;64.1;54;4.5;3
A034;Harina precocida de maiz;100%;380;9.1;3.7;73.9;4;2.7;1
A038;Harina de trigo de primera;100%;363;13.2;1.9;72.1;18;5.1;2
A053;Chocolo mazorca;60%;152;3.4;1.2;30.5;5;0.8;3
B009;Ajo;95%;144;4.7;0.3;29.3;40;1.3;19
B027;Cebolla cabezona;95%;40;1.4;0.1;7.7;24;0.3;4
B028;Cebolla junca;45%;41;1.6;0.2;7.1;44;1.5;16
B035;Cilantro, crudo;90%;44;2.3;0.6;5.9;82;1.8;46
B075;Papa pastusa;100%;96;2;0.1;20.9;6;0.3;6
B079;Perejil, crudo;90%;55;2.9;1;6.9;138;6.6;56
B080;Pimenton;85%;35;1;0.3;6.3;7;0.4;4
B089;Platano harton maduro, crudo;72%;132;1.1;0.2;30.3;3;0.5;4
B092;Platano harton verde;68%;166;1.2;0.2;39.3;8;0.4;26
B103;Tomate chonto;80%;23;0.9;0.1;4.1;9;0.5;6
B107;Yuca;80%;159;0.9;0.3;37.4;16;0.3;14
B110;Zanahoria;85%;47;0.7;0.1;9.5;27;0.4;35
C010;Banano criollo;70%;101;1.5;0.1;22.3;8;0.9;3
C021;Curuba;50%;38;0.6;0.1;8.5;7;1;85
C031;Guayaba madura;75%;71;0.9;0.3;13.4;13;0.3;3
C045;Lulo;60%;48;0.9;0.1;8.9;10;0.6;0
C050;Mandarina;70%;54;0.9;0.1;11.4;35;0.3;2
C052;Mango Tommy;76%;194;0.4;0.1;46.9;8;0.1;0
C054;Manzana;85%;72;0.3;0.2;16.5;16;0.3;2
C060;Maracuya;50%;60;0.7;0;5;11;0.4;7
C061;Mora de castilla;90%;74;1;0.1;14.6;42;1.7;1
C065;Papaya;70%;40;0.5;0.1;8.2;24;0.3;5
C071;Pera;85%;63;0.3;0.2;12.9;8;0.4;1
C072;Piña;55%;56;0.6;0.1;12.4;16;0.5;3
D004;Aceite de girasol;100%;900;0.0;100;0;0;0;0
D018;Margarina;100%;732;0.6;81.1;0;14;0;877
F011;Carne de cerdo, pernil sin hueso;100%;140;21.4;6;0.2;17;0.8;52
F084;Pechuga de pollo con piel hueso;77%;174;26.9;7.4;0;12;0.9;61
F098;Carne de res, cadera;100%;139;21.8;5.7;0;6;2.7;51
F099;Carne de res, sobrebarriga;100%;139;21.8;5.7;0;6;2.7;51
G008;Leche en polvo entera de vaca;100%;499;26.3;26.6;38.4;940;0.5;369
G021;Queso fresco, semiduro, semimagro, tipo doble crema;100%;286;23.4;18.7;5.9;405;0.5;475
J004;Huevo rojo A;90%;149;12.6;10.8;0.3;53;1.7;139
K003;Azucar;100%;397;0;0;99.3;0;0.1;0
K010;Chocolate;100%;466;3.6;16.6;75.5;36;3.5;0
K033;Panela;100%;364;0.6;0.1;90.2;42;4.9;39
L006;cafe molido;100%;479;14.2;12.3;67.5;130;5.8;1
L015;Sal;100%;0;0;0;0;24;0.3;38781
NE;Canela;100%;0;0;0;0;0;0;0
NE;Escencia de Vainilla;100%;0;0;0;0;0;0;0
T003;Arveja verde;100%;374;23.9;1.1;60.2;60;4.6;15
T026;Lenteja;100%;387;23.1;0.9;61;51;7.2;27
EOD;

$db = Config\Database::getInstance()->getConnection();

try {
    $db->beginTransaction();

    $lines = explode("\n", trim($csvData));
    array_shift($lines); // skip header

    $stmtUpdate = $db->prepare("
        UPDATE items 
        SET 
            waste_percentage = :waste_percentage,
            calories = :calories,
            proteins = :proteins,
            fats = :fats,
            carbohydrates = :carbohydrates,
            calcium = :calcium,
            iron = :iron,
            sodium = :sodium
        WHERE pae_id = 7 AND code = :code
    ");

    $stmtInsert = $db->prepare("
        INSERT INTO items (
            pae_id, code, name, food_group_id, measurement_unit_id, 
            waste_percentage, calories, proteins, fats, carbohydrates, 
            calcium, iron, sodium
        ) VALUES (
            7, :code, :name, 1, 1, 
            :waste_percentage, :calories, :proteins, :fats, :carbohydrates, 
            :calcium, :iron, :sodium
        )
    ");

    $inserted = 0;
    $updated = 0;

    foreach ($lines as $line) {
        $cols = explode(";", trim($line));
        if (count($cols) < 10) continue;

        $code = trim($cols[0]);
        $name = trim($cols[1]);
        
        // % COMESTIBLE -> waste_percentage (e.g. 80% comestible = 20% waste)
        $comestibleStr = str_replace('%', '', trim($cols[2]));
        $comestible = floatval($comestibleStr ?: 100);
        $waste_percentage = 100 - $comestible;

        $calories = floatval(trim($cols[3]) ?: 0);
        $proteins = floatval(trim($cols[4]) ?: 0);
        $fats = floatval(trim($cols[5]) ?: 0);
        $carbs = floatval(trim($cols[6]) ?: 0);
        $calcium = floatval(trim($cols[7]) ?: 0);
        $iron = floatval(trim($cols[8]) ?: 0);
        $sodium = floatval(trim($cols[9]) ?: 0);

        $params = [
            ':code' => $code,
            ':waste_percentage' => $waste_percentage,
            ':calories' => $calories,
            ':proteins' => $proteins,
            ':fats' => $fats,
            ':carbohydrates' => $carbs,
            ':calcium' => $calcium,
            ':iron' => $iron,
            ':sodium' => $sodium
        ];

        $stmtUpdate->execute($params);

        if ($stmtUpdate->rowCount() > 0) {
            $updated++;
        } else {
            $params[':name'] = $name;
            try {
                $stmtInsert->execute($params);
                $inserted++;
            } catch (Exception $e) {
                // Ignore duplicates or errors for specific items
                echo "Error inserting $code: " . $e->getMessage() . "\n";
            }
        }
    }

    $db->commit();
    echo "Terminado. Insertados: $inserted. Actualizados: $updated.\n";

} catch (Exception $e) {
    $db->rollBack();
    echo "Error fatal: " . $e->getMessage() . "\n";
}
