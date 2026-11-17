import { ScrollView, Text, View } from 'react-native';
import type { Dossier, Message } from '../api/types';
import { Card } from '../components/ui';
import { dateLongue } from '../format';
import { police, useTheme } from '../theme';

const CATEGORIES: Record<Message['categorie'], string> = {
  proposition: 'Proposition',
  admission: 'Admission',
  info: 'Info',
  etablissement: 'Établissement',
};

export function MessagesScreen({ dossier, maintenant }: { dossier: Dossier; maintenant: Date }) {
  const t = useTheme();
  const nonLus = dossier.messages.filter((m) => !m.lu).length;
  const memeJour = (iso: string) => new Date(iso).toDateString() === maintenant.toDateString();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, marginBottom: 4 }}>
        <Text style={{ color: t.text, fontSize: 30, ...police('800') }}>Messages</Text>
        <Text style={{ color: t.textMuted, fontSize: 14, ...police('500') }}>
          {nonLus === 0 ? 'Tout est lu' : nonLus === 1 ? '1 non lu' : `${nonLus} non lus`}
        </Text>
      </View>
      {dossier.messages.map((m) => (
        <Card key={m.id} style={{ gap: 6, flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, marginTop: 6, marginRight: 10, backgroundColor: m.lu ? 'transparent' : t.accent }} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: t.primary, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 0.5, ...police('700') }}>
                {CATEGORIES[m.categorie]}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: 13, ...police('500') }}>{memeJour(m.date) ? 'Aujourd’hui' : dateLongue(m.date)}</Text>
            </View>
            <Text style={{ color: t.text, fontSize: 15.5, lineHeight: 21, ...police(m.lu ? '500' : '700') }}>{m.titre}</Text>
          </View>
        </Card>
      ))}
      <Text style={{ color: t.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8, ...police('400') }}>
        Le détail des messages se consulte sur le site.
      </Text>
    </ScrollView>
  );
}
