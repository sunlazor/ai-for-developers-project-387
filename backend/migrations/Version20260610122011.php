<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260610122011 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(
            'CREATE TABLE booking (id VARCHAR(255) NOT NULL, booking_type_slug VARCHAR(255) NOT NULL, start_slot DATETIME NOT NULL, visitor_name VARCHAR(255) NOT NULL, visitor_email VARCHAR(255) NOT NULL, PRIMARY KEY (id))',
        );
        $this->addSql(
            'CREATE TABLE booking_type (slug VARCHAR(255) NOT NULL, title VARCHAR(255) NOT NULL, description CLOB NOT NULL, duration_slots INTEGER NOT NULL, active BOOLEAN NOT NULL, PRIMARY KEY (slug))',
        );
        $this->addSql('CREATE TABLE slot (start DATETIME NOT NULL, state VARCHAR(255) NOT NULL, PRIMARY KEY (start))');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE booking');
        $this->addSql('DROP TABLE booking_type');
        $this->addSql('DROP TABLE slot');
    }
}
