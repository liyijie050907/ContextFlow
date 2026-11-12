export type Mode='CET-4'|'CET-6'|'IELTS';
export interface Sense {id:string;pos:string;en:string;zh:string;source:string;status:string;collocations?:string[];domain?:string}
export interface Lexeme {id:string;lemma:string;ipa:{uk?:string;us?:string;other?:string[]};senses:Sense[];cet?:string;ielts?:string;variants?:string[]}
export interface Target {word:string;senseId:string;emphasized?:boolean}
export interface Paragraph {en:string;zh:string;segments?:{zh:string;english?:string;occurrenceId?:string}[]}
export interface Article {batchId?:string;setId?:string;id:string;version:string;title:string;subtitle:string;topic:string;mode:Mode;length:string;paragraphs:Paragraph[];targets:Target[];questionIds:string[];source:string;occurrences?:{id:string;paragraph:number;start:number;end:number;senseId:string;form:string}[]}
export interface Question {id:string;version:string;senseId:string;word:string;context:string;prompt:string;options:string[];answer:number;explanations:string[];contextId:string;type:string}
export interface VocabularyItem {id:string;lexemeId:string;form:string;senseId:string;articleId:string;context:string;createdAt:string}
export interface Override {id:string;lexemeId:string;senseId:string;zh:string;en:string;ipa:string;updatedAt:string;previous?:string}
export interface Attempt {id:string;question:Question;selected:number;correct:boolean;submittedAt:string;effective:boolean;kind?:'initial'|'review'}
export interface ReviewState {id:string;stage:number;firstAt:string;lastAt:string;nextAt:string;successes:number;contexts:string[];errors:number;mastered:boolean}
export interface TargetSet {id:string;name:string;targets:Target[];source:string;updatedAt:string;markdown?:string}
export interface UserState {libraryReset015?:boolean;schema:1;dictionaryVersion:string;vocabulary:VocabularyItem[];overrides:Override[];custom:Lexeme[];sets:TargetSet[];articles:Article[];questions:Question[];attempts:Attempt[];reviews:ReviewState[];readArticles:string[];lookups:number;settings:{theme:'light'|'dark'|'system';fontSize:number;mode:Mode;lastArticle:string;highlight:boolean};updatedAt:string}
export interface Manifest {version:string;status:string;headwords:number;sources:{id:string;name:string;version:string;url:string;license:string}[];coverage:Record<string,unknown>}
export interface Dataset {dictionary:Lexeme[];content:{articles:Article[];questions:Question[];forms:Record<string,string[]>};manifest:Manifest}
