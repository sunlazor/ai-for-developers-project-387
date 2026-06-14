<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260610122322 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TEMPORARY TABLE __temp__slot AS SELECT start, state FROM slot');
        $this->addSql('DROP TABLE slot');
        $this->addSql(
            'CREATE TABLE slot (start DATETIME NOT NULL, state VARCHAR(255) NOT NULL, id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL)',
        );
        $this->addSql('INSERT INTO slot (start, state) SELECT start, state FROM __temp__slot');
        $this->addSql('DROP TABLE __temp__slot');
        $this->addSql('CREATE UNIQUE INDEX uniq_slot_start ON slot (start)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TEMPORARY TABLE __temp__slot AS SELECT start, state FROM slot');
        $this->addSql('DROP TABLE slot');
        $this->addSql('CREATE TABLE slot (start DATETIME NOT NULL, state VARCHAR(255) NOT NULL, PRIMARY KEY (start))');
        $this->addSql('INSERT INTO slot (start, state) SELECT start, state FROM __temp__slot');
        $this->addSql('DROP TABLE __temp__slot');
    }
}
