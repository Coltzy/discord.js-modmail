import {
    CommandInteraction,
    CacheType,
    Client,
    TextChannel,
    Permissions,
    User,
    GuildMember,
} from 'discord.js';

import MailModel from '../../models/Mails';
import { Guild } from '../../types/types';
import Command from '../../Command';

export default class MailAddCommand implements Command {
    public client: Client;
    public name = 'add';
    public guildOnly = true;

    public constructor(client: Client) {
        this.client = client;
    }

    public async execute(
        interaction: CommandInteraction<CacheType>
    ): Promise<void> {
        const user = interaction.options.getUser('user') as User;
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

        try {
            await (
                interaction.channel as TextChannel
            ).permissionOverwrites.edit(user.id, {
                [Permissions.FLAGS.VIEW_CHANNEL.toString()]: true,
            });

            await interaction.reply(
                `Successfully added ${user.toString()} to the mail ticket!`
            );
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'There was an error running this command!',
                ephemeral: true,
            });
        }
    }
}
