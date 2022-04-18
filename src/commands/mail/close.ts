import {
    CommandInteraction,
    CacheType,
    Client,
    MessageActionRow,
    MessageButton,
    Message,
    GuildMember,
} from 'discord.js';

import MailModel from '../../models/Mails';
import { Guild } from '../../types/types';
import Command from '../../Command';

export default class MailCloseCommand implements Command {
    public client: Client;
    public name = 'close';
    public guildOnly = true;

    public constructor(client: Client) {
        this.client = client;
    }

    public async execute(
        interaction: CommandInteraction<CacheType>
    ): Promise<void> {
        const doc = await MailModel.findOne({ id: interaction.channel?.id });
        const settings = this.client.settings.cache.get(
            interaction.guild?.id as string
        ) as Guild;

        if (!doc) {
            return await interaction.reply({
                content: 'This command can only be used in a mail ticket!',
                ephemeral: true,
            });
        } else if (
            this.client._cachedMails.has(interaction.channel?.id as string)
        ) {
            return await interaction.reply({
                content: 'You are already closing this mail ticket!',
                ephemeral: true,
            });
        } else if (
            !this.client.util.hasAccess(
                settings,
                interaction.member as GuildMember
            )
        ) {
            return await interaction.reply({
                content:
                    'You must have either the mail access role or manage guild permissions.',
                ephemeral: true,
            });
        }

        const row = new MessageActionRow().addComponents([
            new MessageButton()
                .setCustomId('CONFIRM')
                .setStyle('SUCCESS')
                .setLabel('Yes'),
            new MessageButton()
                .setCustomId('DENY')
                .setStyle('DANGER')
                .setLabel('No'),
        ]);

        try {
            const message = (await interaction.channel?.messages.fetch(
                doc.panel
            )) as Message;

            message.components[0].components[1].disabled = true;

            await message.edit({
                content: message?.content,
                embeds: [message.embeds[0]],
                components: message.components,
            });
        } catch (error) {
            console.log(error);
        }

        await interaction.reply({
            content: 'Are you sure you want to close this mail ticket?',
            components: [row],
        });

        row.components.forEach((component) => (component.disabled = true));

        const collector = interaction.channel?.createMessageComponentCollector({
            time: 60 * 1000,
        });

        this.client._cachedMails.add(interaction.channel?.id as string);

        collector?.once('collect', async (i) => {
            await i.deferUpdate();

            if (i.customId == 'CONFIRM') {
                try {
                    await MailModel.deleteOne({ id: interaction.channel?.id });
                    await interaction.channel?.delete();
                } catch (error) {
                    console.log(error);

                    await interaction.editReply({
                        content: 'There was an error closing this ticket!',
                        components: [row],
                    });
                }

                return collector.stop('deleted');
            } else {
                try {
                    await interaction.editReply({
                        content: 'Cancelling the closing of this mail ticket!',
                        components: [row],
                    });
                } catch (error) {
                    console.log(error);
                }
            }

            collector.stop();
        });

        collector?.once('end', async (_, reason) => {
            this.client._cachedMails.delete(interaction.channel?.id as string);

            if (reason == 'time') {
                await interaction.editReply({
                    content:
                        'You have ran out of time for the closing of the ticket!',
                    components: [row],
                });
            } else if (reason == 'user') {
                const msg = (await interaction.channel?.messages.fetch(
                    doc.panel
                )) as Message;

                msg.components[0].components[1].disabled = false;

                msg.edit({
                    content: msg.content,
                    embeds: [msg.embeds[0]],
                    components: msg.components,
                });
            }
        });
    }
}
