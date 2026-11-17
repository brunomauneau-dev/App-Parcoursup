import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import type { Dossier, Voeu } from '../api/types';
import { Jauge } from '../components/Jauge';
import { Cible } from '../demo/DemoAuto';
import { BoutonAvis, Card, IconeOnglet, Logo, TitreSection, Variation } from '../components/ui';
import { dateCourte, echeance, heure, jourLong, ordinal, resteAvant } from '../format';
import { DELAI_NOTIFICATION_S, notificationsSysteme } from '../notifications/notificationDemo';
import { police, useTheme } from '../theme';

export type Filtre = 'tous' | 'propositions' | 'attente' | 'refusees';

interface Props {
  dossier: Dossier;
  maintenant: Date;
  rafraichissement: boolean;
  erreur?: string | null;
  onRefresh: () => void;
  onOuvrir: (v: Voeu) => void;
  onVoirVoeux: (f: Filtre) => void;
  onMessages: () => void;
  onSimuler?: () => void;
  onDeconnexion: () => void;
}

export function variationVeille(v: Voeu): number | null {
  const h = v.historique?.filter((p) => p.rang != null) ?? [];
  if (h.length < 2) return null;
  return (h[h.length - 2].rang as number) - (h[h.length - 1].rang as number);
}

const BON_A_SAVOIR = [
  {
    titre: 'Accepter ne ferme pas de portes',
    texte: 'Vous pouvez accepter une proposition et garder vos vœux en attente.',
  },
  {
    titre: 'Les positions bougent chaque matin',
    texte: 'Inutile de vérifier toute la journée : la mise à jour est quotidienne.',
  },
  {
    titre: 'Besoin d’en parler ?',
    texte: 'Votre professeur principal ou un PsyEN peut vous aider à y voir clair.',
  },
];

export function AccueilScreen(p: Props) {
  const t = useTheme();
  const { dossier, maintenant } = p;
  const aRepondre = dossier.voeux
    .filter((v) => v.statut === 'proposition')
    .sort((a, b) => a.dateLimiteReponse!.localeCompare(b.dateLimiteReponse!));
  const acceptee = dossier.voeux.find((v) => v.statut === 'proposition_acceptee');
  const nbPropositions = dossier.voeux.filter((v) => v.statut === 'proposition' || v.statut === 'proposition_acceptee').length;
  const attente = dossier.voeux.filter((v) => v.statut === 'en_attente').sort((a, b) => (a.rang ?? 0) - (b.rang ?? 0));
  const nbRefusees = dossier.voeux.filter((v) => v.statut === 'refuse' || v.statut === 'refusee_par_candidat').length;
  const nonLus = dossier.messages.filter((m) => !m.lu).length;
  const prochaine = aRepondre[0];

  const dates = [
    ...aRepondre.map((v) => ({
      date: v.dateLimiteReponse!,
      libelle: `Date limite de réponse : ${v.formation}`,
    })),
    ...dossier.calendrier,
  ]
    .filter((d) => new Date(d.date) > maintenant)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        gap: 14,
        paddingBottom: 40,
        maxWidth: 560,
        width: '100%',
        alignSelf: 'center',
      }}
      refreshControl={<RefreshControl refreshing={p.rafraichissement} onRefresh={p.onRefresh} />}
    >
      {/* En-tête */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Logo taille={42} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontSize: 17, ...police('800') }}>Suivi Vœux</Text>
          <Text style={{ color: t.textMuted, fontSize: 13, ...police('500') }}>Mon dossier candidat</Text>
        </View>
        <Pressable
          onPress={p.onMessages}
          accessibilityRole="button"
          accessibilityLabel={`Messages, ${nonLus} non lus`}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: t.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconeOnglet nom="messages" couleur={t.text} taille={22} />
          {nonLus > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: t.accent,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 11, ...police('700') }}>{nonLus}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Salutation */}
      <View style={{ gap: 2, marginTop: 4 }}>
        <Text style={{ color: t.textMuted, fontSize: 14, ...police('500') }}>{jourLong(maintenant)} · Phase principale d’admission</Text>
        <Text style={{ color: t.text, fontSize: 30, ...police('800') }}>Bonjour {dossier.prenom}</Text>
        <Text style={{ color: t.textMuted, fontSize: 13, ...police('400') }}>Dossier n° {dossier.numeroDossier} · consultation</Text>
      </View>

      {p.erreur && (
        <View
          accessibilityRole="alert"
          style={{
            backgroundColor: t.dangerBg,
            borderRadius: 16,
            padding: 14,
            gap: 4,
          }}
        >
          <Text style={{ color: t.danger, ...police('700') }}>{p.erreur}</Text>
          <Text style={{ color: t.textMuted, fontSize: 13, ...police('400') }}>
            Informations du {dateCourte(dossier.derniereMiseAJour)}. Tirez vers le bas pour réessayer.
          </Text>
        </View>
      )}

      {/* Carte principale */}
      <Cible id="accueil-carte">
        <View
          style={{
            backgroundColor: t.primaryDark,
            borderRadius: 24,
            padding: 22,
            gap: 14,
          }}
        >
          {prochaine ? (
            <>
              <Etiquette texte="Bonne nouvelle" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 27,
                  lineHeight: 31,
                  ...police('800'),
                }}
              >
                {aRepondre.length === 1 ? 'Une formation vous dit oui.' : `${aRepondre.length} formations vous disent oui.`}
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.88)',
                  fontSize: 15.5,
                  lineHeight: 22,
                  ...police('400'),
                }}
              >
                Prenez le temps d’en parler autour de vous. La réponse se fait sur le site, et vos listes d’attente continuent d’avancer de
                leur côté.
              </Text>
              <Cible id="accueil-echeance">
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: t.accent,
                    }}
                  />
                  <Text
                    style={{
                      color: t.text,
                      fontSize: 14.5,
                      flex: 1,
                      ...police('400'),
                    }}
                  >
                    <Text style={police('700')}>Avant le {echeance(prochaine.dateLimiteReponse!)}</Text> ·{' '}
                    {resteAvant(new Date(prochaine.dateLimiteReponse!), maintenant)}
                  </Text>
                </View>
              </Cible>
              <BoutonClair
                label={aRepondre.length === 1 ? 'Voir ma proposition' : 'Voir mes propositions'}
                onPress={() => p.onVoirVoeux('propositions')}
              />
            </>
          ) : acceptee ? (
            <>
              <Etiquette texte="Votre place est assurée" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 25,
                  lineHeight: 30,
                  ...police('800'),
                }}
              >
                Vous avez accepté {acceptee.formation}.
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.88)',
                  fontSize: 15.5,
                  lineHeight: 22,
                  ...police('400'),
                }}
              >
                Vos vœux en attente continuent d’avancer : vous serez prévenu si une place se libère.
              </Text>
            </>
          ) : (
            <>
              <Etiquette texte="Phase d’admission en cours" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 25,
                  lineHeight: 30,
                  ...police('800'),
                }}
              >
                Vos listes d’attente avancent chaque matin.
              </Text>
            </>
          )}
        </View>
      </Cible>

      {/* Compteurs */}
      <Cible id="accueil-compteurs">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Tuile
            nombre={nbPropositions}
            libelle={nbPropositions > 1 ? 'Propositions' : 'Proposition'}
            point={t.successDot}
            onPress={() => p.onVoirVoeux('propositions')}
          />
          <Tuile nombre={attente.length} libelle="En attente" point={t.warningDot} onPress={() => p.onVoirVoeux('attente')} />
          <Tuile
            nombre={nbRefusees}
            libelle={nbRefusees > 1 ? 'Refusées' : 'Refusée'}
            point={t.neutralDot}
            onPress={() => p.onVoirVoeux('refusees')}
          />
        </View>
      </Cible>

      {/* Listes d'attente */}
      {attente.length > 0 && (
        <>
          <TitreSection titre="Listes d’attente" aDroite={`Mises à jour à ${heure(dossier.derniereMiseAJour)}`} />
          {attente.map((v, i) => {
            const d = variationVeille(v);
            const ref = v.rangDernierAppeleAnneePrecedente;
            return (
              <Cible key={v.id} id={`accueil-attente-${i}`}>
                <Card onPress={() => p.onOuvrir(v)} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          color: t.text,
                          fontSize: 16.5,
                          ...police('700'),
                        }}
                      >
                        {v.formation}
                      </Text>
                      <Text
                        style={{
                          color: t.textMuted,
                          fontSize: 13.5,
                          ...police('400'),
                        }}
                      >
                        {v.etablissement}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          color: t.text,
                          fontSize: 22,
                          ...police('800'),
                        }}
                      >
                        {ordinal(v.rang!)}
                      </Text>
                      {d != null && <Variation valeur={d} suffixe="hier" fond={false} />}
                    </View>
                  </View>
                  {v.totalEnAttente != null && <Jauge rang={v.rang!} total={v.totalEnAttente} zone={ref} />}
                  {ref != null && (
                    <Text
                      style={{
                        color: t.textMuted,
                        fontSize: 13,
                        ...police('400'),
                      }}
                    >
                      {v.rang! <= ref
                        ? `Dans les rangs appelés l’an dernier (jusqu’au ${ordinal(ref)})`
                        : `L’an dernier, appel jusqu’au ${ordinal(ref)}`}
                    </Text>
                  )}
                </Card>
              </Cible>
            );
          })}
        </>
      )}

      {/* Bon à savoir */}
      <TitreSection titre="Bon à savoir" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 16 }}
        style={{ marginHorizontal: -16, paddingLeft: 16 }}
      >
        {BON_A_SAVOIR.map((b) => (
          <View
            key={b.titre}
            style={{
              width: 230,
              backgroundColor: t.info,
              borderRadius: 20,
              padding: 16,
              gap: 6,
            }}
          >
            <Text style={{ color: t.text, fontSize: 15.5, ...police('700') }}>{b.titre}</Text>
            <Text
              style={{
                color: t.textMuted,
                fontSize: 14,
                lineHeight: 20,
                ...police('400'),
              }}
            >
              {b.texte}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Prochaines dates */}
      {dates.length > 0 && (
        <>
          <TitreSection titre="Prochaines dates" />
          <Card style={{ paddingVertical: 6 }}>
            {dates.map((d, i) => (
              <View
                key={d.libelle}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderColor: t.border,
                }}
              >
                <View
                  style={{
                    width: 50,
                    backgroundColor: t.surfaceAlt,
                    borderRadius: 12,
                    paddingVertical: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: t.text, fontSize: 18, ...police('800') }}>{new Date(d.date).getDate()}</Text>
                  <Text
                    style={{
                      color: t.textMuted,
                      fontSize: 12,
                      ...police('500'),
                    }}
                  >
                    {dateCourte(d.date).split(' ')[1]}
                  </Text>
                </View>
                <Text
                  style={{
                    color: t.text,
                    fontSize: 15,
                    flex: 1,
                    lineHeight: 21,
                    ...police('500'),
                  }}
                >
                  {d.libelle}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      <View style={{ marginTop: 10, gap: 10 }}>
        <BoutonAvis />
      </View>

      {p.onSimuler && (
        <View
          style={{
            marginTop: 10,
            borderTopWidth: 1,
            borderColor: t.border,
            paddingTop: 16,
            gap: 8,
          }}
        >
          <Text
            style={{
              color: t.textMuted,
              fontSize: 12,
              textAlign: 'center',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              ...police('700'),
            }}
          >
            Outil de démonstration
          </Text>
          <Pressable
            onPress={p.onSimuler}
            accessibilityRole="button"
            style={({ pressed }) => ({
              borderRadius: 16,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: t.textMuted,
              padding: 14,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: t.text, ...police('700') }}>Simuler la mise à jour de la nuit</Text>
          </Pressable>
          {notificationsSysteme && (
            <Text
              style={{
                color: t.textMuted,
                fontSize: 13,
                textAlign: 'center',
                ...police('400'),
              }}
            >
              Une vraie notification arrive {DELAI_NOTIFICATION_S} secondes après : verrouillez l’écran pour la voir.
            </Text>
          )}
        </View>
      )}

      <Pressable onPress={p.onDeconnexion} accessibilityRole="button" style={{ alignSelf: 'center', padding: 12 }}>
        <Text style={{ color: t.primary, fontSize: 14, ...police('600') }}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

function Etiquette({ texte }: { texte: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 12.5, ...police('700') }}>{texte}</Text>
    </View>
  );
}

function BoutonClair({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.55)',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 16, ...police('700') }}>{label}</Text>
    </Pressable>
  );
}

function Tuile({ nombre, libelle, point, onPress }: { nombre: number; libelle: string; point: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: t.surface,
        borderRadius: 18,
        padding: 12,
        gap: 2,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 9,
          height: 9,
          borderRadius: 5,
          backgroundColor: point,
          marginBottom: 6,
        }}
      />
      <Text style={{ color: t.text, fontSize: 28, ...police('800') }}>{nombre}</Text>
      <Text style={{ color: t.textMuted, fontSize: 13.5, ...police('500') }}>{libelle}</Text>
    </Pressable>
  );
}
