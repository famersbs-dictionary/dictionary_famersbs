-- DB Create

create databse dicfamersbs;

use dicfamersbs;



-- dictionary table

create table dic_word ( word varchar(100) , descript varchar(255), lastupdate datetime, delete_flag char(1) default '0' ) default charset = 'utf8';

